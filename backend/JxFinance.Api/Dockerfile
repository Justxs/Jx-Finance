FROM mcr.microsoft.com/dotnet/sdk:10.0.404@sha256:fe0fd4e93bd2fbb47c883b7a6369e5c8d3db8bf01cdc5981f6ee35fbdf3ff4fb AS build
ARG TARGETARCH
WORKDIR /src

COPY .editorconfig global.json ./
COPY backend/Directory.Build.props backend/Directory.Packages.props backend/
COPY backend/JxFinance.Api/JxFinance.Api.csproj backend/JxFinance.Api/
RUN dotnet restore backend/JxFinance.Api/JxFinance.Api.csproj -a $TARGETARCH

COPY backend/ backend/
RUN dotnet publish backend/JxFinance.Api/JxFinance.Api.csproj -c Release -a $TARGETARCH --self-contained false --no-restore -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0.15@sha256:bfd912c83295ce66d4b706ebb8541b9f14259b0e76fbb88b2751f58ce2399d2e
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
