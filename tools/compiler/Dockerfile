
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY tools/compiler/Backend ./Backend

WORKDIR /src/Backend

RUN dotnet restore "Backend.csproj"

RUN dotnet publish "Backend.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5170

ENTRYPOINT ["dotnet", "Backend.dll"]