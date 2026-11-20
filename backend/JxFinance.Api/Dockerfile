FROM mcr.microsoft.com/dotnet/sdk:11.0.100@sha256:65f3c7c6a25a239ab3e6719f2896147e7b68242ff2d8818dd70498bde6ef8bea AS build
ARG TARGETARCH
WORKDIR /src

COPY .editorconfig global.json ./
COPY backend/Directory.Build.props backend/Directory.Packages.props backend/
COPY backend/JxFinance.Api/JxFinance.Api.csproj backend/JxFinance.Api/
RUN dotnet restore backend/JxFinance.Api/JxFinance.Api.csproj -a $TARGETARCH

COPY backend/ backend/
RUN dotnet publish backend/JxFinance.Api/JxFinance.Api.csproj -c Release -a $TARGETARCH --self-contained false --no-restore -o /app

FROM mcr.microsoft.com/dotnet/aspnet:11.0.0@sha256:bc0d6653979efba491ab3d6f589d691f96c309c3c3ef81325efa6978e7b7f242
LABEL org.opencontainers.image.title="Jx Finance API" \
      org.opencontainers.image.description="A private household ledger you run yourself: the ASP.NET Core API." \
      org.opencontainers.image.source="https://github.com/Justxs/Jx-Finance" \
      org.opencontainers.image.url="https://github.com/Justxs/Jx-Finance" \
      org.opencontainers.image.licenses="MIT"
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl fonts-dejavu-core ghostscript tesseract-ocr tesseract-ocr-eng tesseract-ocr-lit \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir /keys /backups /attachments /import-inbox && chown app:app /keys /backups /attachments /import-inbox
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "JxFinance.Api.dll"]
