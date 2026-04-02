FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY mototun.sln ./
COPY src/mototun.API/mototun.API.csproj src/mototun.API/
COPY src/mototun.Core/mototun.Core.csproj src/mototun.Core/
COPY src/mototun.Infrastructure/mototun.Infrastructure.csproj src/mototun.Infrastructure/

RUN dotnet restore src/mototun.API/mototun.API.csproj

COPY src/ ./src/
RUN dotnet publish src/mototun.API/mototun.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./

EXPOSE 10000

CMD ["sh", "-c", "ASPNETCORE_URLS=http://+:${PORT:-10000} dotnet mototun.API.dll"]
