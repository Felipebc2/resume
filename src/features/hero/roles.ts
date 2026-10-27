/** Pads every role to the same width so each letter cell can roll in place. */
export const padRoles = (roles: string[]) => {
  const len = Math.max(...roles.map((r) => r.length));
  return roles.map((r) => r.padEnd(len, " ").replace(/ /g, " "));
};
