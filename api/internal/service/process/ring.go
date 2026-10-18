package process

import (
	"strings"
	"sync"
)

type RingBuffer struct {
	mu       sync.Mutex
	lines    []string
	capacity int
	partial  strings.Builder
}

func NewRingBuffer(capacity int) *RingBuffer {
	if capacity <= 0 {
		capacity = 1000
	}
	return &RingBuffer{capacity: capacity}
}

func (r *RingBuffer) Write(p []byte) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, chunk := range strings.SplitAfter(string(p), "\n") {
		if chunk == "" {
			continue
		}
		if !strings.HasSuffix(chunk, "\n") {
			r.partial.WriteString(chunk)
			continue
		}
		line := r.partial.String() + strings.TrimRight(chunk, "\n")
		r.partial.Reset()
		r.append(line)
	}
	return len(p), nil
}

func (r *RingBuffer) Lines() []string {
	r.mu.Lock()
	defer r.mu.Unlock()

	out := make([]string, 0, len(r.lines)+1)
	out = append(out, r.lines...)
	if r.partial.Len() > 0 {
		out = append(out, r.partial.String())
	}
	return out
}

func (r *RingBuffer) append(line string) {
	if len(r.lines) == r.capacity {
		copy(r.lines, r.lines[1:])
		r.lines = r.lines[:r.capacity-1]
	}
	r.lines = append(r.lines, line)
}
