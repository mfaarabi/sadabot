package repository

import "sadabot/internal/entity"

type TenantRepository struct{}

func NewTenantRepository() *TenantRepository {
	return &TenantRepository{}
}

func (t *TenantRepository) GetAllTenants() []entity.Tenant {
	return []entity.Tenant{
		{
			Name:                 "John Doe",
			Room:                 101,
			Phone:                "1234567890",
			RentalExpirationDate: "2025-04-01",
		},
		{
			Name:                 "Jane Smith",
			Room:                 102,
			Phone:                "0987654321",
			RentalExpirationDate: "2025-04-05",
		},
	}
}
