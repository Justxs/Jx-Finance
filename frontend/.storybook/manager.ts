import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "Jx Finance",
    brandImage: "./favicon.svg",
    brandTarget: "_self",
    colorPrimary: "#253e52",
    colorSecondary: "#253e52",
  }),
});
