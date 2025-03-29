package messagesender

import "fmt"

type WhatsappMessageSender struct{}

func NewWhatsappMessageSender() *WhatsappMessageSender {
	return &WhatsappMessageSender{}
}

func (w *WhatsappMessageSender) Send(message, number string) {
	fmt.Printf("Sending message to number %s:\n%s", number, message)
}
