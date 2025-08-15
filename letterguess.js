const alphabet = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

// this one used for Pick random letter in js
const actualIndex = Math.floor(Math.random() * alphabet.length);
const actualLetter = alphabet[actualIndex];

let attempts = 0;

console.log("I have picked a letter from A to Z. Can you guess it?");

//readline is lets ur program read input from the user and write output in console
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
});

function getArea(guessIndex) {
  const hotLower = Math.max(actualIndex - 3, 0);
  const hotUpper = Math.min(actualIndex + 3, alphabet.length - 1);

  const warmLower = Math.max(hotLower - 2, 0);
  const warmUpper = Math.min(hotUpper + 2, alphabet.length - 1);

  const coolLower = Math.max(warmLower - 3, 0);
  const coolUpper = Math.min(warmUpper + 3, alphabet.length - 1);

  if (guessIndex >= hotLower && guessIndex <= hotUpper) {
    return "HOT";
  } else if (guessIndex >= warmLower && guessIndex <= warmUpper) {
    return "WARM";
  } else if (guessIndex >= coolLower && guessIndex <= coolUpper) {
    return "COOL";
  } else {
    return "ICE";
  }
}

function askGuess() {
  readline.question("Enter your guess: ", (input) => {
    const guess = input.trim().toUpperCase();
    const guessIndex = alphabet.indexOf(guess);

    if (guessIndex === -1) {
      console.log("Please enter a valid letter from A to Z.");
      return askGuess();
    }

    attempts++;

    if (guessIndex === actualIndex) {
      console.log(`You are correct! The letter was ${actualLetter}.`);
      console.log(`It took you ${attempts} attempts.`);
      readline.close();
    } else {
      const area = getArea(guessIndex);
      console.log(`Your guess is in the ${area} area. Try again!`);
      askGuess();
    }
  });
}

askGuess();
