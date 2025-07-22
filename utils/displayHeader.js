const clearConsole = () => {
  console.clear();
};

const displayHeader = () => {
  console.log("|||||||||||||||||||||||||||||||");
  console.log("===============================");
  console.log("     🚀 Server de JandoChat    ");
  console.log("===============================");
  console.log("|||||||||||||||||||||||||||||||");
};

module.exports = () => {
  clearConsole();
  displayHeader();
};
