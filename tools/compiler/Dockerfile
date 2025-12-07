# 1. BUILD STAGE
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копираме цялото хранилище (Root Context)
COPY . .

# Променяме работната директория към папката с C# проекта
# Ключово: Влизаме във вътрешната папка Backend/
WORKDIR /src/tools/compiler/Backend 

# Възстановяваме зависимостите (Backend.csproj вече е в текущата директория)
RUN dotnet restore "Backend.csproj"

# Публикуваме проекта
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# -----------------------------------------------------------
# 2. FINAL/RUNTIME STAGE
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Задаваме порта
ENV ASPNETCORE_URLS=http://+:5170

# Стартова команда
ENTRYPOINT ["dotnet", "Backend.dll"]