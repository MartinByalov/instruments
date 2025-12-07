# 1. BUILD STAGE
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копираме САМО папката Backend/ от нашето хранилище в корена на Docker WORKDIR.
# Пътят е относително спрямо корена на Git хранилището
COPY tools/compiler/Backend ./Backend 

# Сменяме работната директория към папката с C# проекта
WORKDIR /src/Backend 

# Възстановяваме зависимостите (Backend.csproj вече е в текущата директория)
RUN dotnet restore "Backend.csproj"

# Публикуваме проекта
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# --- FORCE CACHE BUST ---
# Добавете нов коментар, който ще нулира кеша на Render/Docker за всички следващи стъпки
# Cache busting comment: 20251207

# -----------------------------------------------------------
# 2. FINAL/RUNTIME STAGE
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Задаваме порта
ENV ASPNETCORE_URLS=http://+:5170

# Стартова команда
ENTRYPOINT ["dotnet", "Backend.dll"]