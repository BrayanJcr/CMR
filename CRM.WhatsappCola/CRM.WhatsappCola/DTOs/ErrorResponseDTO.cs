namespace CRM.WhatsappCola.DTOs
{
    public class ErrorResponseDTO
    {
        public IEnumerable<string> ErrorMessages { get; set; }

        public ErrorResponseDTO(string message)
        {
            ErrorMessages = new List<string>() { message };
        }

        public ErrorResponseDTO(IEnumerable<string> errorMessages)
        {
            ErrorMessages = errorMessages;
        }
    }
}
