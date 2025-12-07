# 1. Използваме SDK образа за компилиране (Build stage)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Копираме цялото хранилище (от корена, който Render клонира)
# Render изпълнява това от корена на хранилището (поради празно Root Directory)
# Трябва да промените тази COPY команда, за да работи с Render
# АКО Render работи от корена на Git репото:
COPY . .

# Променяме работната директория към папката на C# проекта
WORKDIR /src/tools/compiler

# Възстановяваме зависимостите (Backend.csproj вече е в текущата директория /src/tools/compiler)
# Ако Render вече е в 'tools/compiler' поради Root Directory:
# RUN dotnet restore "Backend.csproj" 

# Копираме останалия код и го компилираме
RUN dotnet restore "Backend.csproj"
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# 2. Използваме Runtime образа за изпълнение (Final stage)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Задаваме порта
ENV ASPNETCORE_URLS=http://+:5170

# Стартова команда
ENTRYPOINT ["dotnet", "Backend.dll"]