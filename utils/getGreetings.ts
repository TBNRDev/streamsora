export const getGreetings = () => {
  const time = new Date().getHours();
  let greeting = "";

  if (time >= 5 && time < 12) {
    greeting = "Good Morning";
  } else if (time >= 12 && time < 18) {
    greeting = "Good Afternoon";
  } else if (time >= 18 && time < 22) {
    greeting = "Good Evening";
  } else if (time >= 22 || time < 5) {
    greeting = "Good Night";
  }

  return greeting;
};
