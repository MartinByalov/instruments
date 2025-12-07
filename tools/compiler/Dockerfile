# 1. Използваме SDK образа за компилиране (Build stage)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копираме .csproj файла и възстановяваме зависимостите
COPY ["Backend.csproj", "."]
RUN dotnet restore "Backend.csproj"

# Копираме останалия код и го компилираме
COPY . .
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# 2. Използваме Runtime образа за изпълнение (Final stage)
# Това прави крайния контейнер малък и сигурен
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Задаваме порта (Render обикновено използва 8080/443, но може да го промените)
ENV ASPNETCORE_URLS=http://+:5170

# Стартова команда
ENTRYPOINT ["dotnet", "Backend.dll"]