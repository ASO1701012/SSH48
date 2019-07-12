//var ss_ID= '1Xmea2bUvCaQ_rjoBEjKBKUTdZzVObS682iro_w0J8zI';
var slackAccessToken = '自身の組織のアクセストークンを入力してください';
var slackApp = SlackApp.create(slackAccessToken);
//'ssh48のスプレッドシート'をidから開く
var ss = SpreadsheetApp.openById("1Xmea2bUvCaQ_rjoBEjKBKUTdZzVObS682iro_w0J8zI");
//テンプレのフォームをidから開く
var form = FormApp.openById("1CcaOXTw-pYJR8VRTQrz8ge_boaqzSyN-71cn6bKfoyo");
var domain = 'ssh48';


function doPost(e) {
  //domain = e.parameter.team_domain;
  var icon=':icon_default:';
  var teamsheet = ss.getSheetByName('team');　//'team'シートを開く
  //リストの開始行とデータの入っている最終行の取得
  var StartRow = 2;
  var lastRow = teamsheet.getLastRow();

  var teamData = [];
  var teamFrag = [];
  teamData = teamsheet.getRange(StartRow,1,lastRow-StartRow+1,1).getValues(); //指定列の値を配列にぶち込む
  teamFrag = teamsheet.getRange(StartRow,2,lastRow-StartRow+1,1).getValues(); //指定列の値を配列にぶち込む

  //チーム名と一致する行番号を取得
  for(i=0;i<lastRow-1;i++) {
    if(domain==teamData[i].toString()){
      break;
    }
  }

  //同組織の重複投票の排除
  //fragnum = i+2;
  //if(teamsheet.getRange(fragnum,2).getValue() == "T"){
    //Logger.log(teamsheet.getRange(fragnum,2).getValue());
    //teamsheet.getRange(fragnum,2).setValue('F');
  if(teamFrag[i] == 'T'){
    form.setAcceptingResponses(true); //投票可能
    Logger.log(teamsheet.getRange(i+2,2).getValue());
    //現在投票を実行中を表すフラグを挿入
    teamsheet.getRange(i+2,2).setValue('F');

    //ラズパイ用に電源onoff用送信
    var ms;
    if(e.parameter.text == "あつい" || e.parameter.text == "暑い") {
      ms = 'hot';
    }
    else {
      ms = 'cold';
    }
    //var slackApp = SlackApp.create(slackAccessToken);
    // 対象チャンネル
    var channelId = "#gas_rest-ras_get";
    //var channelId = "#実験";
    var options = {
      username: "gas-ras"
    }
    //slackの対象チャンネルにメッセージを送信
    slackApp.postMessage(channelId, ms, options);

    //Slackのユーザリストを取得
    var listurl = 'https://' + domain + '.slack.com/api/users.list?token=' + slackAccessToken;
    var listres = UrlFetchApp.fetch(listurl);
    var listjson = JSON.parse(listres.getContentText());
    var choices = [];
    for each(var val in listjson["members"]) {
      if(val["is_bot"] == false && val["real_name"] != "Slackbot"){
        //配列にチームの'real_name'をぶち込む
        choices.push(val["name"]);
      }
    }

    //formのurl取得
    var tmp = form.getPublishedUrl();

    //制限時間の計算
    var triggerDay = new Date();
    var minutes = triggerDay.getMinutes();
    triggerDay.setMinutes(minutes+2);
    var minute = triggerDay.getMinutes();
    var hours = triggerDay.getHours();
    if(minute < 10) {
      var time = hours + ":0" + minute;
    }
    else{
      var time = hours + ":" + minute;
    }

    //ユーザー別にリンクを生成しurlと制限時間を送信
    for(var i=0;i<choices.length;i++){
      var message = "エアコンの温度変更の申請がありました！\nリンクから投票を行ってください\n"+tmp + "?entry.786710318=" + choices[i] + "\n投票の終了時刻は" + time + "です";
      sendFst(choices[i],message,icon);
    }

    //制限時間後に集計処理その他を実行
    setTrigger();
  }
  else{
    var ms = "現在投票中です..."
    var channelId = "airboの部屋";
    var icon = ':icon_sad:';
    var options = {
      username: "airbo",
      icon_emoji: icon
    };
    //slackの対象チャンネルにメッセージを送信
    slackApp.postMessage(channelId, ms, options);
  }
}

function Returns() {

  //トリガーの削除
  deleteTrigger();
  //'domain'シートを開く
  var sheet = ss.getSheetByName(domain);
  var itemData  = [];
  var nameList = [];
  //リストの開始行とデータの入っている最終行の取得
  var StartRow = 2;
  var lastRow = sheet.getLastRow();

  var upC=0;
  var downC=0;
  var noC=0;

  //投票が1件以上された場合以下集計処理等を実行
  if(lastRow>1){
    //投票で選ばれた選択肢を配列に代入('下げる','上げる','何もしなし')
    nameList = sheet.getRange(StartRow,4,lastRow-StartRow+1,1).getValues();
    itemData = sheet.getRange(StartRow,3,lastRow-StartRow+1,1).getValues();
    /*
    //重複回答排除(ユーザー単位)
    var x;
    var y;
    for(x=0;x<lastRow-2;x++){
      for(y=x+1;y<lastRow-1;y++){
        if(nameList[x].toString() == nameList[y].toString()){
          itemData[y]=' ';
        }
      }
    }
    */

    //新重複回答排除(ユーザー単位)
    var x;
    var y;
    for(x=lastRow-2;x>=1;x--){
      for(y=x-1;y>=0;y--){
        if(nameList[x].toString() == nameList[y].toString()){
          itemData[y]=' ';
        }
      }
    }

    //新集計処理
    for(i=0;i<lastRow-1;i++){
      if(itemData[i]=='１度下げる'){
        downC++;
      }
      else if(itemData[i]=='１度上げる') {
        upC++;
      }
      else if(itemData[i]=='何もしない') {
        noC++;
      }
    }
  }

  //一番多い選択をflagに代入
  var flag='';
  if(upC>downC && upC>noC){
    //ここにup動作
    flag='up';
  }else if(upC<downC && noC<downC){
    //ここにdpwn操作
    flag='down';
  }else{
    //ここに中止動作
    flag='cansel';
  }

  SendMessage(flag);

  //投票を締め切り
  form.setAcceptingResponses(false);

  //シートの集計内容をクリア
  sheet.deleteRows(2,lastRow);
  //'team'シートを開く
  var teamsheet = ss.getSheetByName('team');
  var StartRow = 2;
  var lastRow = teamsheet.getLastRow();
  var Domain = [];
  Domain = teamsheet.getRange(StartRow,1,lastRow-StartRow+1,1).getValues();
  for(i=0;i<lastRow-1;i++) {
    if(domain==Domain[i].toString()){
      break;
    }
  }
  //投票を実行できることを表すフラグを挿入
  teamsheet.getRange(i+2,2).setValue('T');

}
