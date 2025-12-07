# 1. Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копираме цялото репо (Render клонира в /opt/render/project/src => вътре става /src)
COPY . .

# Отиваме в истинската директория на C# проекта
WORKDIR /src/instruments/tools/compiler/Backend

# Възстановяваме зависимостите
RUN dotnet restore "Backend.csproj"

# Публикуваме
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# 2. Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

# Настройваме ASP.NET Core да слуша на порт 5170
ENV ASPNETCORE_URLS=http://+:5170

ENTRYPOINT ["dotnet", "Backend.dll"]
