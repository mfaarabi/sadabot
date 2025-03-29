package main

import (
	"sadabot/internal/repository"
	"sadabot/internal/usecase"
	"sadabot/internal/usecase/messagesender"
)

func main() {
	tenantRepository := repository.NewTenantRepository()
	whatsappMessageSender := messagesender.NewWhatsappMessageSender()
	runner := usecase.NewRunner(whatsappMessageSender, tenantRepository)
	runner.Run()
}
