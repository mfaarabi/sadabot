package usecase_test

import (
	"testing"
	"time"

	"sadabot/internal/entity"
	"sadabot/internal/usecase"

	"github.com/stretchr/testify/mock"
)

type MockMessageSender struct {
	mock.Mock
}

func (m *MockMessageSender) Send(tenant entity.Tenant) {
	m.Called(tenant)
}

type MockTenantRepository struct {
	mock.Mock
}

func (m *MockTenantRepository) GetAllTenants() ([]entity.Tenant, error) {
	args := m.Called()
	return args.Get(0).([]entity.Tenant), args.Error(1)
}

func (m *MockTenantRepository) UpdateTenants(tenants []entity.Tenant) error {
	args := m.Called(tenants)
	return args.Error(0)
}

func (m *MockTenantRepository) ArchivePayments(tenants []entity.Tenant) error {
	args := m.Called(tenants)
	return args.Error(0)
}

func TestRun_ShouldNotifyTenant(t *testing.T) {
	mockRepo := new(MockTenantRepository)
	mockSender := new(MockMessageSender)
	r := usecase.NewRunner(mockSender, mockRepo)

	today := time.Now().Truncate(24 * time.Hour)

	// Define test cases
	testCases := []struct {
		name         string
		tenant       entity.Tenant
		shouldNotify bool
	}{
		{"Notify on day-7", entity.Tenant{DueDate: today.AddDate(0, 0, 7).Format("2006-01-02")}, true},
		{"Notify on day-3", entity.Tenant{DueDate: today.AddDate(0, 0, 3).Format("2006-01-02")}, true},
		{"Notify on day-1", entity.Tenant{DueDate: today.AddDate(0, 0, 1).Format("2006-01-02")}, true},
		{"Do not notify if past due date", entity.Tenant{DueDate: today.AddDate(0, 0, -1).Format("2006-01-02")}, false},
		{"Do not notify if payment is confirmed", entity.Tenant{DueDate: today.AddDate(0, 0, 7).Format("2006-01-02"), PaymentConfirmed: "2025-03-29"}, false},
		{"Do not notify if tenant claimed they paid", entity.Tenant{DueDate: today.AddDate(0, 0, 7).Format("2006-01-02"), ClaimedHavePaid: "2025-03-28"}, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockRepo.ExpectedCalls = nil
			mockSender.ExpectedCalls = nil

			mockRepo.On("GetAllTenants").Return([]entity.Tenant{tc.tenant}, nil)

			if tc.shouldNotify {
				mockSender.On("Send", tc.tenant).Return().Once()
			} else {
				mockSender.AssertNotCalled(t, "Send", tc.tenant)
			}

			r.Run()

			mockSender.AssertExpectations(t)
			mockRepo.AssertExpectations(t)
		})
	}
}
