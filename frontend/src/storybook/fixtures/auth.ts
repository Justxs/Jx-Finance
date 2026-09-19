import type {
  EnableTwoFactorResponse,
  LoginResponse,
  TwoFactorSetupResponse,
} from "@/api/generated/model";
import { currentUser } from "./users";

export const twoFactorSetup: TwoFactorSetupResponse = {
  sharedKey: "jbsw y3dp ehpk 3pxp k5tq mzxw 6ytb onqx",
  authenticatorUri:
    "otpauth://totp/Jx%20Finance:ruta.kazlauskiene%40example.lt?secret=JBSWY3DPEHPK3PXPK5TQMZXW6YTBONQX&issuer=Jx%20Finance&digits=6",
};

export const twoFactorRecoveryCodes: EnableTwoFactorResponse = {
  recoveryCodes: [
    "7KQ2M-X9PLD",
    "B4TNV-R6HWC",
    "ZP83J-5FYGA",
    "M2DXC-Q7LRT",
    "H9WVB-3KNSE",
    "T6RFA-8JCMP",
    "C5GLY-W2ZQH",
    "N8ESK-4VBTD",
    "R3JHP-6MXFN",
    "Y7UCW-9DGKL",
  ],
};

export const loginSuccess: LoginResponse = {
  twoFactorRequired: false,
  profile: currentUser,
};

export const loginTwoFactorRequired: LoginResponse = {
  twoFactorRequired: true,
  profile: null,
};
