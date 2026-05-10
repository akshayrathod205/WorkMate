package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gorilla/mux"
)

// subscriberBuffer is the per-subscriber channel size. Slow consumers that
// fall behind by more than this are dropped (the message is skipped for them)
// rather than blocking the publisher.
const subscriberBuffer = 16

type subscriber struct {
	id        uint64
	projectID int
	ch        chan Event
}

type eventHub struct {
	mu      sync.RWMutex
	subs    map[int]map[uint64]*subscriber
	nextID  atomic.Uint64
}

func newEventHub() *eventHub {
	return &eventHub{subs: make(map[int]map[uint64]*subscriber)}
}

var hub = newEventHub()

func (h *eventHub) subscribe(projectID int) *subscriber {
	s := &subscriber{
		id:        h.nextID.Add(1),
		projectID: projectID,
		ch:        make(chan Event, subscriberBuffer),
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[projectID] == nil {
		h.subs[projectID] = make(map[uint64]*subscriber)
	}
	h.subs[projectID][s.id] = s
	return s
}

func (h *eventHub) unsubscribe(s *subscriber) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if m, ok := h.subs[s.projectID]; ok {
		delete(m, s.id)
		if len(m) == 0 {
			delete(h.subs, s.projectID)
		}
	}
	close(s.ch)
}

func (h *eventHub) publish(e Event) {
	if e.ProjectID == nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	m := h.subs[*e.ProjectID]
	for _, s := range m {
		select {
		case s.ch <- e:
		default:
			// subscriber buffer full — skip this event for this listener
		}
	}
}

func streamProjectEvents(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r)

	projectID, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "invalid project id", http.StatusBadRequest)
		return
	}

	allowed, err := userCanAccessProject(claims, projectID)
	if err != nil {
		http.Error(w, "failed to verify access", http.StatusInternalServerError)
		return
	}
	if !allowed {
		http.Error(w, "You do not have access to this project", http.StatusForbidden)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	fmt.Fprint(w, ": connected\n\n")
	flusher.Flush()

	sub := hub.subscribe(projectID)
	defer hub.unsubscribe(sub)

	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case <-heartbeat.C:
			if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil {
				return
			}
			flusher.Flush()
		case e, open := <-sub.ch:
			if !open {
				return
			}
			body, err := json.Marshal(e)
			if err != nil {
				continue
			}
			if _, err := fmt.Fprintf(w, "id: %d\nevent: %s\ndata: %s\n\n", e.ID, e.Kind, body); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
