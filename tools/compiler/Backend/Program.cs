// Program.cs
var builder = WebApplication.CreateBuilder(args);

// Добавяне на контролери
builder.Services.AddControllers();

// Добавяне на CORS (трябва да е преди app.Build())
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.AllowAnyOrigin() 
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// ИЗПОЛЗВАНЕ на CORS (трябва да е рано)
app.UseCors("AllowFrontend");

// АКТИВИРАНЕ НА МАРШРУТИЗИРАНЕТО (ТРЯБВА ДА Е ПРЕДИ app.Run())
app.MapControllers(); // <-- КРИТИЧНО!

app.Run();