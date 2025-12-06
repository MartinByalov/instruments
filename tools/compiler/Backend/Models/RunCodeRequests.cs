namespace Backend.Models
{
    // Този клас мапва JSON тялото на POST заявката от фронтенда.
    public class RunCodeRequest
    {
        // C# кодът, въведен от потребителя в текстовия редактор.
        public string Code { get; set; }

        // Полето за симулиран конзолен вход (ако програмата чете данни).
        // В script.js го изпращаме като празен низ засега.
        public string Input { get; set; } 
    }
}