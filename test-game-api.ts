import axios from "axios";

const API_KEY = "VyS7QQNynL8ulPd8AuC1v3M4AFSkZbzl3achqjtI";
const BASE_URL = "https://open-api.bser.io";

async function test() {
  try {
    const res = await axios.get(`${BASE_URL}/v1/games/59285362`, {
      headers: { "x-api-key": API_KEY }
    });
    console.log("Game Participants:", res.data.userGames?.length, "players found.");
    if (res.data.userGames && res.data.userGames.length > 0) {
      console.log("First player data keys:", Object.keys(res.data.userGames[0]).slice(0, 10));
    }
  } catch (e: any) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}
test();
