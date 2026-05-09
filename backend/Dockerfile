FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN go build -o task-manager .

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/task-manager .
EXPOSE 8080
CMD ["./task-manager"]
