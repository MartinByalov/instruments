using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// --- 1. ДОБАВЯНЕ НА СЕРВИЗИТЕ ---

// Добавяне на поддръжка за контролери (тук е CompilerController)
builder.Services.AddControllers();

// ** КРИТИЧНО! ** Добавяне на CORS политика
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            // Позволява достъп от всеки източник (*), което е необходимо при разработка.
            // При production, заменете "*" с конкретния домейн на вашия фронтенд.
            policy.AllowAnyOrigin() 
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});


// --- 2. КОНФИГУРИРАНЕ НА HTTP ПАЙПЛАЙНА ---

var app = builder.Build();

// Премахване на несъществени компоненти (като WeatherForecast, OpenApi, HttpsRedirection)

// Използване на CORS политиката (ТРЯБВА ДА Е ТУК)
app.UseCors("AllowFrontend");

// Маршрутизиране на заявките към контролерите (CompilerController)
app.MapControllers();

app.Run();