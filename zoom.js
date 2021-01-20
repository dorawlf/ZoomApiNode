var url = require("url");
require("date-utils");
var request = require("request");
const { get } = require("request");
var iconv = require("iconv-lite");
var fs = require("fs");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

var pageSize = 1;
var status = "active";
var domainStr = "https://api.zoom.us/v2/";
var pageNum = 1;

var userQuery = domainStr + "users?page_size=" + pageSize + "&status=" + status;

var users = [];
var meetings = [];
var participants=[];

var meetingsMap = new Map();
var currentdate = new Date();
var nowDateTime = currentdate.toFormat("YYYY-MM-DD");

var toDate = nowDateTime;
var fromDate = new Date(
  new Date(toDate).setMonth(new Date(toDate).getMonth() - 1)
).toFormat("YYYY-MM-DD");

getUsers();

async function getUsers() {
  let userObjs = await doQuery(userQuery);
  var totalPageCount = userObjs.page_count;

  users.push(userObjs.users[0]);

  while (totalPageCount > pageNum) {
    pageNum++;

    userQuery =
      domainStr +
      "users?page_number=" +
      pageNum +
      "&page_size=" +
      pageSize +
      "&status=" +
      status;

    userObjs = await doQuery(userQuery);
    console.log(userObjs.users[0]);
    users.push(userObjs.users[0]);
  }

  console.log("Get All Users.");

  for (let index = 0; index < users.length; index++) {
    for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
      currentdate = new Date();
      toDate = new Date(
        currentdate.setMonth(currentdate.getMonth() - monthIndex)
      ).toFormat("YYYY-MM-DD");
      currentdate = new Date();
      fromDate = new Date(
        currentdate.setMonth(currentdate.getMonth() - monthIndex - 1)
      );
      monthAgo = new Date(fromDate);
      fromDate = new Date(monthAgo.setDate(monthAgo.getDate() + 1)).toFormat(
        "YYYY-MM-DD"
      );

      console.log(fromDate + " - " + toDate);

      meetingQuery =
        domainStr +
        "report/users/" +
        users[index].id +
        "/meetings" +
        "?page_size=300" +
        "&from=" +fromDate +
        "&to=" + toDate;
        console.log(`meetingQuery for ${users[index].id} : ${meetingQuery}`);
      
      meetingObjs = await doQuery(meetingQuery);
      
      meetingObjs.meetings.forEach((o) => {
        // console.log(o);
        // meetings.push(o);
        meetingsMap.set(o.uuid, o);
      });
    }
  }
  console.log("start meetings list")
  console.log(meetingsMap);
  console.log("Get All Meetings.");

  // Retrieve get participants from meetingsMap.
 for (const uuid of meetingsMap.keys()){
  participantsQuery = domainStr + "report/meetings/"+ escape(encodeURIComponent(uuid)) + "/participants";
  console.log(participantsQuery);
  result = await doQuery(participantsQuery);
  
  result.participants.forEach((o) => {
    // console.log(o);
    
    participants.push(
      {
        uuid:meetingsMap.get(uuid).uuid,
        id:meetingsMap.get(uuid).id,
        host_id:meetingsMap.get(uuid).host_id,
        type:meetingsMap.get(uuid).type,
        topic:meetingsMap.get(uuid).topic,
        organizer_user_name:meetingsMap.get(uuid).user_name,
        organizer_user_email:meetingsMap.get(uuid).user_email,
        start_time:meetingsMap.get(uuid).start_time,
        end_time:meetingsMap.get(uuid).end_time,
        duration:meetingsMap.get(uuid).duration,
        total_minutes:meetingsMap.get(uuid).total_minutes,
        participants_count:meetingsMap.get(uuid).participants_count,
        dept:meetingsMap.get(uuid).dept,
        participant_uuid:o.id,
        user_id:o.user_id,
        participant_name:o.name,
        participant_user_email:o.user_email,
        join_time:o.join_time,
        leave_time:o.leave_time,
        participant_duration:o.duration,
        attentiveness_score:o.attentiveness_score
      });
  });
}

console.log(`Get All Participants`);

  jsonMeetings = JSON.stringify(participants);

  console.log(jsonMeetings);
  fs.writeFile("meetingsJSON.json", jsonMeetings, function (err) {
    if (err) {
      console.log(err);
    } else {
      console.log("json file saved!");

      fs.readFile("meetingsJSON.json", function (err, data) {
        if (err) {
          console.log(err);
        } else {
          console.log("json file readed!");
          jsondata = JSON.parse(data);
          console.log(jsondata);

          const fields = [
            "uuid",
            "id",
            "host_id",
            "topic",
            "type",
            "start_time",
            "duration",
            "timezone",
            "created_at",
            "join_url",
          ];
        
          const { Parser } = require("json2csv");

          const json2csvParser = new Parser();

          const csv = json2csvParser.parse(jsondata);
          console.log(csv);

          const dist = "meetings.csv";
          fs.writeFileSync(dist, ""); 
          var fd = fs.openSync(dist, "w");
          var buf = iconv.encode(csv, "Shift_JIS"); 
          fs.write(fd, buf, 0, buf.length, function (err, written, buffer) {

            if (err) throw err;
            console.log("csv file saved!");
          });

          // fs.writeFile("meetings.csv", csv, function (err) {
          //   if (err) {
          //     console.log(err);
          //   } else {
          //     console.log("It's saved!");
          //   }
          // });
        }
      });
    }
  });
}

function doQuery(searchURL) {
  //console.log("Doing Query...");
  return new Promise(function (resolve, reject) {
    request(
      {
        url: searchURL,
        headers: {
          authorization://JWT Tokenはこちらです。今は23:59 07/21/2080まで期限設定しています。
            "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhdWQiOm51bGwsImlzcyI6IlZGSE5GNVNkVFh1cXFxeDFYaUM3UkEiLCJleHAiOjM0ODg3OTk1NDAsImlhdCI6MTU5NTMwMjg3Mn0.iEWPNaDu5oNZTajUYoHLG1xKTCuxG_oEZwe0nnwIFXc",
        },
        method: "GET",
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
          //console.log("body is :");
          //console.log(body);
          resolve(JSON.parse(body));
        } else {
          console.log("error is :");
          console.log(error);
          console.log("Retry... ...")
          
          reject(error);
        }
      }
    );
  });
}
