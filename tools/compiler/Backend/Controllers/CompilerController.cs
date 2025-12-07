using Microsoft.AspNetCore.Mvc;
using Backend.Models; // Уверете се, че RunCodeRequest е дефиниран тук
using System.Text;
using System.IO;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis.CSharp.Scripting; 
using Microsoft.CodeAnalysis.Scripting;
using System.Reflection; 
using System.Linq; 
using System;

[ApiController]
// КОРИГИРАНО: Премахване на "api" за да съвпадне с ръчното проксиране от Node.js
[Route("")]
public class CompilerController : ControllerBase
{
    // *** ПРЕДПОЛАГАЕМ МОДЕЛ: ***
    /*
    public class RunCodeRequest 
    {
        public string Code { get; set; }
        public string Input { get; set; } // Може да не се използва
    }
    */

    // КОРИГИРАНО: Този път /run-code вече е пълен маршрут, очакван от Node.js
    [HttpPost("run-code")]
    public async Task<IActionResult> RunCode([FromBody] RunCodeRequest request)
    {
        if (string.IsNullOrEmpty(request.Code))
        {
            return BadRequest(new { isSuccess = false, output = "Кодът не може да бъде празен." });
        }

        // 1. Настройка за прихващане на конзолния изход (STDOUT)
        var outputCollector = new StringBuilder();
        // Използваме using, за да гарантираме освобождаването на ресурса
        await using var writer = new StringWriter(outputCollector); 
        var originalConsoleOut = Console.Out;
        
        try
        {
            // Пренасочете стандартния изход към нашия StringWriter
            Console.SetOut(writer);

            // 2. Дефиниране на Roslyn опциите
            var scriptOptions = ScriptOptions.Default
                .WithReferences(
                    typeof(object).Assembly,
                    typeof(System.Console).Assembly, 
                    typeof(Enumerable).Assembly,
                    typeof(System.Collections.Generic.List<>).Assembly 
                )
                .WithImports("System", "System.Linq", "System.Collections.Generic", "System.Threading.Tasks"); 

            // 3. Компилация и изпълнение на скрипт фрагмента
            await CSharpScript.RunAsync(request.Code, scriptOptions);
            
            // Гарантираме, че целият изход е записан
            await writer.FlushAsync(); 
            
            // 4. Връщане на събрания изход
            return Ok(new { isSuccess = true, output = outputCollector.ToString() });
        }
        catch (CompilationErrorException compileEx)
        {
            // Грешки при компилация (в Roslyn формат за парсване от JS)
            return Ok(new { isSuccess = false, output = string.Join("\n", compileEx.Diagnostics) });
        }
        catch (Exception runtimeEx)
        {
            // Грешки при изпълнение
            return Ok(new { isSuccess = false, output = $"Грешка при изпълнение:\n{runtimeEx.InnerException?.Message ?? runtimeEx.Message}" });
        }
        finally
        {
            // 5. Възстановяване на оригиналния конзолен изход (Критично!)
            Console.SetOut(originalConsoleOut);
        }
    }
}