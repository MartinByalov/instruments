# 1. BUILD STAGE
# Използваме SDK образа за компилиране
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Копираме само файла на проекта, за да оптимизираме кеширането
# Пътят е относително спрямо корена на хранилището (Build Context)
COPY tools/compiler/Backend/Backend.csproj tools/compiler/Backend/

# Сменяме работната директория към папката с проекта
WORKDIR /src/tools/compiler/Backend

# Възстановяваме зависимостите
RUN dotnet restore "Backend.csproj"

# Копираме всички останали файлове на C# проекта (Program.cs, Controllers и т.н.)
COPY tools/compiler/Backend/. .

# Публикуваме проекта
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# -----------------------------------------------------------
# 2. FINAL/RUNTIME STAGE
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Задаваме порта (5170, както е конфигурирано)
ENV ASPNETCORE_URLS=http://+:5170

# Стартова команда
ENTRYPOINT ["dotnet", "Backend.dll"]