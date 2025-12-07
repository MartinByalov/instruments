# 1. BUILD STAGE
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the Backend directory from the root of the repository
COPY Backend ./Backend

# Change to the Backend directory
WORKDIR /src/Backend 

# Restore dependencies
RUN dotnet restore "Backend.csproj"

# Publish the project
RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

# -----------------------------------------------------------
# 2. FINAL/RUNTIME STAGE
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Set the port
ENV ASPNETCORE_URLS=http://+:5170

# Startup command
ENTRYPOINT ["dotnet", "Backend.dll"]