import brcypt from "bcrypt";

// export const hashPassword = async (password: string): Promise<string> => {
//     const saltRounds = 10;

//     const hashedPassword = await brcyp
// }

export const comparedPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await brcypt.compare(password, hashedPassword);
};
    