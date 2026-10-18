package handler

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/dto"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/service"
	"github.com/andikapradanaarif/vishnu/internal/service/cloner"
	"github.com/andikapradanaarif/vishnu/internal/service/process"
	"github.com/andikapradanaarif/vishnu/internal/usecase"
)

type ProjectService interface {
	Create(ctx context.Context, req dto.CreateProjectRequest) (usecase.CreateResult, error)
	List(ctx context.Context) ([]dto.ProjectResponse, error)
	Delete(ctx context.Context, id string) error
	EnsureWorkspace(ctx context.Context, id string) (dto.WorkspaceResponse, error)
}

type ProjectHandler struct {
	projects ProjectService
}

func NewProjectHandler(projects ProjectService) *ProjectHandler {
	return &ProjectHandler{projects: projects}
}

func (h *ProjectHandler) Register(app *fiber.App) {
	app.Get("/api/projects", h.List)
	app.Post("/api/projects", h.Create)
	app.Delete("/api/projects/:id", h.Delete)
	app.Get("/api/projects/:id/workspace", h.EnsureWorkspace)
}

func (h *ProjectHandler) List(c fiber.Ctx) error {
	projects, err := h.projects.List(c.RequestCtx())
	if err != nil {
		return h.fail(c, err)
	}
	return c.JSON(projects)
}

func (h *ProjectHandler) Create(c fiber.Ctx) error {
	var req dto.CreateProjectRequest
	if err := c.Bind().Body(&req); err != nil {
		return errorJSON(c, fiber.StatusBadRequest, "invalid_request", "malformed request body")
	}

	result, err := h.projects.Create(c.RequestCtx(), req)
	if err != nil {
		return h.fail(c, err)
	}

	status := fiber.StatusCreated
	if result.Cloning {
		status = fiber.StatusAccepted
	}
	return c.Status(status).JSON(dto.CreateProjectResponse{Project: result.Project})
}

func (h *ProjectHandler) Delete(c fiber.Ctx) error {
	if err := h.projects.Delete(c.RequestCtx(), c.Params("id")); err != nil {
		return h.fail(c, err)
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *ProjectHandler) EnsureWorkspace(c fiber.Ctx) error {
	workspace, err := h.projects.EnsureWorkspace(c.RequestCtx(), c.Params("id"))
	if err != nil {
		return h.fail(c, err)
	}
	return c.JSON(workspace)
}

func (h *ProjectHandler) fail(c fiber.Ctx, err error) error {
	status, code := statusFor(err)
	return errorJSON(c, status, code, err.Error())
}

func errorJSON(c fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(fiber.Map{"message": message, "code": code})
}

func statusFor(err error) (int, string) {
	switch {
	case errors.Is(err, errs.ErrInvalidProject),
		errors.Is(err, errs.ErrInvalidPath),
		errors.Is(err, errs.ErrInvalidUpstream),
		errors.Is(err, cloner.ErrUnsupportedRepo):
		return fiber.StatusBadRequest, "invalid_request"
	case errors.Is(err, cloner.ErrRepoUnreachable):
		return fiber.StatusForbidden, "repository_unreachable"
	case errors.Is(err, errs.ErrProjectNotFound):
		return fiber.StatusNotFound, "not_found"
	case errors.Is(err, errs.ErrProjectConflict):
		return fiber.StatusConflict, "conflict"
	case errors.Is(err, process.ErrNotConfigured),
		errors.Is(err, process.ErrUnreachable),
		errors.Is(err, process.ErrHealthTimeout),
		errors.Is(err, service.ErrUpstreamUnreachable),
		errors.Is(err, service.ErrUpstreamBadResponse):
		return fiber.StatusBadGateway, "crush_unreachable"
	default:
		return fiber.StatusInternalServerError, "internal_error"
	}
}
