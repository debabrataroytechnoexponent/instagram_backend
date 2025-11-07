const generatePassword = async (length) => {
  const upperCase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowerCase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specialChars = "!@$(()[]";
  const allChars = upperCase + lowerCase + numbers + specialChars;

  let password = "";
  // ensure at least one of each
  password += upperCase[Math.floor(Math.random() * upperCase.length)];
  password += lowerCase[Math.floor(Math.random() * lowerCase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // fill remaining length
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // shuffle for randomness
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  return password;
};

module.exports = {
  generatePassword,
};
