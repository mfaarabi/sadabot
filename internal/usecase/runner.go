package usecase

import (
	"sadabot/internal/entity"
	"time"
)

type MessageSender interface {
	Send(entity.Tenant)
}

type TenantRepository interface {
	GetAllTenants() ([]entity.Tenant, error)
	UpdateTenants([]entity.Tenant) error
	ArchivePayments([]entity.Tenant) error
}

type Runner struct {
	messageSender    MessageSender
	tenantRepository TenantRepository
}

func NewRunner(messageSender MessageSender, tenantRepository TenantRepository) *Runner {
	return &Runner{
		messageSender:    messageSender,
		tenantRepository: tenantRepository,
	}
}

func (r *Runner) Run() {
	tenants, _ := r.tenantRepository.GetAllTenants()
	for _, tenant := range tenants {
		if r.shouldNotifyTenant(tenant) {
			r.messageSender.Send(tenant)
		}
	}
}

func (r *Runner) shouldNotifyTenant(tenant entity.Tenant) bool {
	today := time.Now().Truncate(24 * time.Hour)
	due, _ := time.Parse("2006-01-02", tenant.DueDate)

	// Stop notifying if due date has passed or payment is confirmed
	if today.After(due) || tenant.PaymentConfirmed != "" {
		return false
	}

	// Stop notifying if tenant claimed they paid
	if tenant.ClaimedHavePaid != "" {
		return false
	}

	// Notify on day-7, day-3, and day-1 before due date
	daysUntilDue := int(due.Sub(today).Hours() / 24)
	return daysUntilDue == 7 || daysUntilDue == 3 || daysUntilDue == 1
}
