module.exports = {
  api: {
    input: "./openapi.json",
    output: {
      mode: "single",
      client: "react-query",
      target: "./src/api/generated/index.ts",
      schemas: "./src/api/generated/model",
      override: {
        mutator: {
          path: "./src/api/client.ts",
          name: "customFetch",
        },
      },
    },
  },
};
