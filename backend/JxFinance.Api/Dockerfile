FROM mcr.microsoft.com/dotnet/sdk:11.0.100@sha256:2794448a07118a6eaf00f29ab5d2bf44928517ce5ff86505a63a69230374f599 AS build
ARG TARGETARCH
WORKDIR /src

COPY .editorconfig global.json ./
COPY backend/Directory.Build.props backend/Directory.Packages.props backend/
COPY backend/JxFinance.Api/JxFinance.Api.csproj backend/JxFinance.Api/
RUN dotnet restore backend/JxFinance.Api/JxFinance.Api.csproj -a $TARGETARCH

COPY backend/ backend/
RUN dotnet publish backend/JxFinance.Api/JxFinance.Api.csproj -c Release -a $TARGETARCH --self-contained false --no-restore -o /app

FROM mcr.microsoft.com/dotnet/aspnet:11.0.0@sha256:ca396ece3f2a2e62c7a03f1d7d710b8bc7e8c9dea5597d091178d9f5bfca13f0
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
