package process

import "testing"

func TestRingBufferTrimsToCapacity(t *testing.T) {
	buffer := NewRingBuffer(3)
	if _, err := buffer.Write([]byte("one\ntwo\nthree\nfour\n")); err != nil {
		t.Fatalf("write: %v", err)
	}

	lines := buffer.Lines()
	want := []string{"two", "three", "four"}
	if len(lines) != len(want) {
		t.Fatalf("got %v, want %v", lines, want)
	}
	for i := range want {
		if lines[i] != want[i] {
			t.Fatalf("got %v, want %v", lines, want)
		}
	}
}

func TestRingBufferKeepsIncompleteLines(t *testing.T) {
	buffer := NewRingBuffer(10)
	if _, err := buffer.Write([]byte("part")); err != nil {
		t.Fatalf("write: %v", err)
	}
	if _, err := buffer.Write([]byte("ial\nnext")); err != nil {
		t.Fatalf("write: %v", err)
	}

	lines := buffer.Lines()
	if len(lines) != 2 || lines[0] != "partial" || lines[1] != "next" {
		t.Fatalf("got %v, want [partial next]", lines)
	}
}

func TestRingBufferDefaultsCapacity(t *testing.T) {
	buffer := NewRingBuffer(0)
	if buffer.capacity != 1000 {
		t.Fatalf("got capacity %d, want 1000", buffer.capacity)
	}
}
