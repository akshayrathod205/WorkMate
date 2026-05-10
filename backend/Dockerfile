FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o task-manager .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates wget && \
    addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder /app/task-manager .
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["./task-manager"]
