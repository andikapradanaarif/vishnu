package email

import (
	"context"
	"log/slog"
)

// LogService stands in for a real provider when none is configured: it
// writes the message to the log so a local sign-in can still be completed,
// and says so loudly rather than failing silently.
type LogService struct{}

func NewLogService() EmailService {
	return &LogService{}
}

func (s *LogService) SendEmail(_ context.Context, payload *EmailPayload) error {
	slog.Warn("Email delivery is not configured — the message is only logged",
		"to", payload.To,
		"subject", payload.Subject,
		"body", payload.Body,
	)
	return nil
}
