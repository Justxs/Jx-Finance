FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/JxFinance.Api/JxFinance.Api.csproj backend/JxFinance.Api/
COPY backend/JxFinance.Domain/JxFinance.Domain.csproj backend/JxFinance.Domain/
COPY backend/JxFinance.Infrastructure/JxFinance.Infrastructure.csproj backend/JxFinance.Infrastructure/
RUN dotnet restore backend/JxFinance.Api/JxFinance.Api.csproj

COPY backend/ backend/
RUN dotnet publish backend/JxFinance.Api/JxFinance.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "JxFinance.Api.dll"]
