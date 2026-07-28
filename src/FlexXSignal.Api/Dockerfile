FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY FlexXSignal.sln .
COPY src/FlexXSignal.Domain/FlexXSignal.Domain.csproj src/FlexXSignal.Domain/
COPY src/FlexXSignal.Application/FlexXSignal.Application.csproj src/FlexXSignal.Application/
COPY src/FlexXSignal.Infrastructure/FlexXSignal.Infrastructure.csproj src/FlexXSignal.Infrastructure/
COPY src/FlexXSignal.SignalEngine/FlexXSignal.SignalEngine.csproj src/FlexXSignal.SignalEngine/
COPY src/FlexXSignal.Api/FlexXSignal.Api.csproj src/FlexXSignal.Api/
COPY tests/FlexXSignal.Tests/FlexXSignal.Tests.csproj tests/FlexXSignal.Tests/
RUN dotnet restore src/FlexXSignal.Api/FlexXSignal.Api.csproj

COPY src/ src/

RUN dotnet publish src/FlexXSignal.Api/FlexXSignal.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .

# Uses bash's built-in /dev/tcp instead of curl/wget so the runtime image needs no extra
# apt-get layer (and no package-manager network access) just to support a health check.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080 && printf "GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n" >&3 && grep -q "200 OK" <&3' || exit 1

ENTRYPOINT ["dotnet", "FlexXSignal.Api.dll"]
