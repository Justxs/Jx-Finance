module.exports = {
  api: {
    input: "./openapi.json",
    output: {
      mode: "single",
      client: "react-query",
      clean: true,
      target: "./src/api/generated/index.ts",
      schemas: "./src/api/generated/model",
      override: {
        query: {
          useSuspenseQuery: true,
        },
        mutator: {
          path: "./src/api/client.ts",
          name: "customFetch",
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
    hooks: {
      afterAllFilesWrite: "oxfmt",
    },
  },
};
