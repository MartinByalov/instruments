# 1. BUILD STAGE
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копираме САМО C# проекта и го правим работна директория
# Важно: Пътят е относителен спрямо корена на хранилището, тъй като Render Root Directory е празно
COPY tools/compiler/Backend.csproj tools/compiler/
COPY tools/compiler/. .

# Работна директория за възстановяване
WORKDIR /src/tools/compiler

# Възстановяваме зависимостите (Backend.csproj вече е в текущата директория)
RUN dotnet restore "Backend.csproj"

# Копираме всички останали файлове на проекта (ако има повече от само .csproj)
COPY tools/compiler/. .

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