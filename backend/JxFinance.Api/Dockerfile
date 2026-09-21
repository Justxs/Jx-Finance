FROM mcr.microsoft.com/dotnet/sdk:10.0.401@sha256:2fa828c68761b1b8c23d7662dc134421b9d3b59fe1425fdbc80804e390cdb24d AS build
WORKDIR /src

COPY .editorconfig global.json ./
COPY backend/Directory.Build.props backend/Directory.Packages.props backend/
COPY backend/JxFinance.Api/JxFinance.Api.csproj backend/JxFinance.Api/
RUN dotnet restore backend/JxFinance.Api/JxFinance.Api.csproj

COPY backend/ backend/
RUN dotnet publish backend/JxFinance.Api/JxFinance.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0.12@sha256:6a94333d37514e385650a3c81a55e5350b67253dbe136e9cf17e499c35606a8c
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir /keys /backups /attachments && chown app:app /keys /backups /attachments
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "JxFinance.Api.dll"]
