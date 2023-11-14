require("dotenv").config({ path: "./assets/modules/.env" });
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const jsonFilePath = "userRecords.json";
const commands = JSON.parse(fs.readFileSync("./assets/commands/commands.json", 'utf-8'))
let userRecords = [];
let usersAwaitingUsername = {};


try {
  userRecords = JSON.parse(fs.readFileSync(jsonFilePath, "utf-8"));
} catch (err) {
  console.error("Ошибка чтения JSON-файла:", err);
}

const bot = new TelegramBot(
  process.env.devStatus ? process.env.TEST_TOKEN : process.env.DEFAULT_TOKEN,
  { polling: true }
);

bot.setMyCommands(commands)

bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userMessage = msg.text;

    if (usersAwaitingUsername[userId]) {
      const stage = usersAwaitingUsername[userId].stage;

      if (stage === "username") {
        usersAwaitingUsername[userId].username = userMessage;
        usersAwaitingUsername[userId].stage = "description";

        await bot.sendMessage(chatId, "Теперь пришлите мне описание.");

      } else if (stage === "description") {
        usersAwaitingUsername[userId].description = userMessage;
        usersAwaitingUsername[userId].stage = "photo";

        await bot.sendMessage(
          chatId,
          `Теперь пришлите мне фото вместе с вашим описанием: ${userMessage}`
        );

      } else if (stage === "photo") {
        const photoFileId = msg.photo[0].file_id;

        userRecords.push({
          user_id: userId,
          username: usersAwaitingUsername[userId].username,
          description: usersAwaitingUsername[userId].description,
          photo: photoFileId,
        });

        delete usersAwaitingUsername[userId];

        fs.writeFileSync(jsonFilePath, JSON.stringify(userRecords, null, "\t"));
        console.log("Данные успешно записаны в JSON-файл");

        await bot.sendMessage(
          chatId,
          "Спасибо! Мы рассмотрим ваш запрос."
        );
      }
    } else {
      const user = userRecords.find((x) => x.username === userMessage);

      if (user) {
        await bot.sendMessage(chatId, "Этот пользователь уже добавлен");
      } else if (userMessage === '/start') {
        usersAwaitingUsername[userId] = { stage: "username" };
        await bot.sendMessage(chatId, "Пожалуйста, пришлите мне ваше имя пользователя.");
      }
    }
  } catch (error) {
    console.error('Ошибка в обработчике сообщений:', error);
  }
});

bot.on("photo", async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const photoFileId = msg.photo[0].file_id;
    const channelUsername = "@testkworkkk"
    const userRecord = userRecords.find((record) => record.user_id === userId);

    if (userRecord) {
      userRecord.photo = photoFileId;

      fs.writeFileSync(jsonFilePath, JSON.stringify(userRecords, null, "\t"));
      
      await bot.sendPhoto(channelUsername, photoFileId, {
        caption: `User ID: ${userRecord.user_id}\nUsername: ${userRecord.username}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "Принять", callback_data: "accept" }, { text: "Отклонить", callback_data: "decline" }]
          ],
        },
      });
      
      await bot.sendMessage(chatId, "Спасибо! Мы рассмотрим ваш запрос.");
    }
  } catch (error) {
    console.error('Ошибка в обработчике фото:', error);
  }
});

bot.on("callback_query", async (msg) => {
  try {
    if (msg.data === "accept") {
      await bot.sendMessage("channelId", "текст");
    } else if (msg.data === "decline") {
      await bot.sendMessage(msg.chat.id, "некоторый текст");
    }
  } catch (error) {
    console.error('Ошибка в обработчике callback_query:', error);
  }
});

bot.on("polling_error", console.log)
