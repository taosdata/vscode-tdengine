const vscode = require('vscode');
const taos = require("@tdengine/client");
const path = require('path');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    console.log('Congratulations, your extension "extension-to-3-0" is now active!');
    let tree_base = new TreeBaseShower();
    let panel;
    let connect_td;

    let refresh_tree = vscode.commands.registerCommand('nodeDependencies.refreshEntry', async () => {
            console.log(connect_td);
            var conn = taos.connect({
                host: connect_td['_host'],
                user: connect_td['_user'],
                password: connect_td['_password'],
                config: connect_td['_config'],
                port: connect_td['_port'],
            });
            var cursor = conn.cursor();
            var data_list = await get_database_list(cursor);
            console.log(data_list);
            let data_dict = {};

            // 这段运行慢暂时注释
            for (let db of data_list) {
                let t1 = await executeSql("use " + db, 0, cursor);
                let t2 = await get_base_table(cursor);
                data_dict[db] = await t2;
                console.log(data_dict);
            }


            var promise = cursor.query("SHOW DATABASES;", true);


            promise.then(function (result) {

                let aa = "org"
                aa = String(result["data"][2]["data"][0]);
                let dict_t = {"demo": ["t"]};
                dict_t['test'] = ["d250"];
                console.log(data_dict);
                console.log(dict_t)
                tree_base = new TreeBaseShower(data_dict);

                vscode.window.registerTreeDataProvider("nodeDependencies", tree_base)
                //Close a connection

            });


        }
    );
    context.subscriptions.push(refresh_tree);


    let log_baselist = vscode.commands.registerCommand('extension-to-3-0.helloWorld', async (host, user, password, config, port) => {
        try {

            console.log(host, user, password, config, port);
            const answer = "Yes";
            // const answer = await vscode.window.showInformationMessage('Log in?', "Yes", "No");

            if (answer === 'Yes') {


                var conn = taos.connect({
                    host: host,
                    user: user,
                    password: password,
                    config: config,
                    port: port,
                });

                var cursor = await conn.cursor(); // Initializing a new cursor
                console.log(cursor);
                vscode.window.showInformationMessage("Log in!!!");

                panel.dispose();


                var data_list = await get_database_list(cursor);
                console.log(data_list);
                let data_dict = {};

                // 这段运行慢暂时注释
                for (let db of data_list){
                	// let t1 = await executeSql("use "+db, 0,cursor);
                	// let t2 = await get_base_table(cursor);
                	data_dict[db] = [];
                	console.log(data_dict);
                }


                var promise= cursor.query("SHOW DATABASES;", true);


                promise.then(function (result) {

                    let dict_t ={ "demo": [ "t"]};
                    dict_t['test'] = ["d250"];
                	console.log(data_dict);
                	console.log(dict_t)
                    tree_base = new TreeBaseShower(data_dict);

                    vscode.window.registerTreeDataProvider("nodeDependencies", tree_base)
                    //Close a connection

                });
                connect_td = conn;
                console.log('Close a connection');
                // conn.close(); // close connection
                


            } else {

            }
        } catch (e) {
            console.log(e)
            vscode.window.showInformationMessage("Wrong config");

        }


    });

    context.subscriptions.push(log_baselist);
    context.subscriptions.push(
        vscode.commands.registerCommand('extension-to-3-0.login',async () => {

            await closepanel();
            while(true){
                await sleep(30);
                // 写个警告
                if(connect_td != null){
                    console.log(connect_td);
                    // vscode.commands.executeCommand("nodeDependencies.refreshEntry");
                    
                    break;
                }                
            }
            await sleep(30);
            vscode.commands.executeCommand("nodeDependencies.refreshEntry");
                       

        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("nodeDependencies.addEntry",async (node) =>{
            const command_panel = vscode.window.createWebviewPanel(
                'command',
                'Cammand',
                vscode.ViewColumn.One,
                {
                    // Enable scripts in the webview
                    enableScripts: true
                }
            );
            var conn = taos.connect({
                host: connect_td['_host'],
                user: connect_td['_user'],
                password: connect_td['_password'],
                config: connect_td['_config'],
                port: connect_td['_port'],
            });
            var cursor = conn.cursor()
            let mem = ''
            command_panel.webview.html = await get_command_window(mem,'');
            command_panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'alert':
                            
                            
                            try{
                                if(message.sql_command.slice(0,6) === 'select'){
                                    let sql_cmd;
                                    // vscode.window.showErrorMessage(message.sql_command +" is not a lygal SQL");
                                    if (message.sql_command.match('limit') ){
                                        sql_cmd= message.sql_command;
                                    }
                                    else{
                                        sql_cmd = message.sql_command.slice(0,-1)+' limit 0,50;' 
                                    }
                                    console.log(sql_cmd);
                                    let query_text = await select_HTML(sql_cmd,cursor)
                                    mem += query_text;

                                }
                                else if(message.sql_command === 'clear'){
                                    mem = ''

                                }
                                else{
                                    let query_text = await executeSql(message.sql_command,0,cursor)
                                    console.log(query_text);                                
                                    mem += '<h3>'+query_text+'<br/>' +'</h3>'

                                    
                                }
                                command_panel.webview.html = await get_command_window(mem,message.sql_command);
                                
                            }
                            catch (e){
                                vscode.window.showErrorMessage(message.sql_command +" is not a lygal SQL");
                                console.log(e);
                                return;
                            }
                            
                            // console.log("select * from " + node['frombase'] + "." + node['label']+" order by "+ message.sort_item+ " limit 0,10")
                            
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        })
    );



    let disposable3 = vscode.commands.registerCommand('nodeDependencies.checkTable', async (node) => {
        const table_panel = vscode.window.createWebviewPanel(
            'checkTable',
            'Checking Table',
            vscode.ViewColumn.One,
            {
                // Enable scripts in the webview
                enableScripts: true
            }
        );
        // console.log(node['frombase'], node['label']);
        // console.log(connect_td['_host'], connect_td['_user'], connect_td['_password'], connect_td['_config'], connect_td['_port']);
        // console.log(connect_td);
        var conn = taos.connect({
            host: connect_td['_host'],
            user: connect_td['_user'],
            password: connect_td['_password'],
            config: connect_td['_config'],
            port: connect_td['_port'],
        });
        var cursor = conn.cursor()
        let query_text = await executeQuery_get_html("select * from " + node['frombase'] + "." + node['label'] + " limit 0,10", cursor, true)
        table_panel.webview.html = query_text;
        // console.log(query_text);
        table_panel.webview.onDidReceiveMessage(
            async message => {
                let query_text;
                switch (message.command) {
                    case 'alert':
                        var conn = taos.connect({
                            host: connect_td['_host'],
                            user: connect_td['_user'],
                            password: connect_td['_password'],
                            config: connect_td['_config'],
                            port: connect_td['_port'],
                        });
                        vscode.window.showInformationMessage(message.order)
                        var cursor = conn.cursor()
                        // vscode.window.showInformationMessage(message.sort_item);
                        if( message.sort_item === 'default'){
                            query_text = await executeQuery_get_html("select * from " + node['frombase'] + "." + node['label']+ " limit 0,10", cursor, true)
                            
                            
                            return;
                        }
                        
                        if(message.order ==="ASC"){
                            query_text = await executeQuery_get_html("select * from " + node['frombase'] + "." + node['label']+" order by "+ message.sort_item+ " limit 0,10", cursor, true)

                        }
                        else{
                            query_text = await executeQuery_get_html("select * from " + node['frombase'] + "." + node['label']+" order by "+ message.sort_item+ " DESC limit 0,10", cursor, true)

                        }
                        // console.log("select * from " + node['frombase'] + "." + node['label']+" order by "+ message.sort_item+ " limit 0,10")
                        table_panel.webview.html = query_text;
                        return;
                    case 'sort_up':
                        var conn = taos.connect({
                            host: connect_td['_host'],
                            user: connect_td['_user'],
                            password: connect_td['_password'],
                            config: connect_td['_config'],
                            port: connect_td['_port'],
                        });
                        
                        var cursor = conn.cursor()
                        query_text = await executeQuery_get_html("select * from " + node['frombase'] + "." + node['label']+" order by "+ message.sort_i+ " limit 0,10", cursor, true)
                        // vscode.window.showInformationMessage(message.sort_i);
                        table_panel.webview.html = query_text;
                        console.log('soortup');
                        return;
                    case 'sort_down':
                        var conn = taos.connect({
                            host: connect_td['_host'],
                            user: connect_td['_user'],
                            password: connect_td['_password'],
                            config: connect_td['_config'],
                            port: connect_td['_port'],
                        });
                        var cursor = conn.cursor()
                        query_text = await executeQuery_get_html("select * from " + node['frombase'] + "." + node['label']+" order by "+ message.sort_i+ " DESC limit 0,10", cursor, true)
                        // vscode.window.showInformationMessage(message.sort_i);
                        console.log('soortup');
                        table_panel.webview.html = query_text;
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
        cursor.close();
    });
    context.subscriptions.push(disposable3);
    
    async function closepanel() {

        panel = vscode.window.createWebviewPanel(
        'logIn',
        'Log in',
        vscode.ViewColumn.One,
        {
            enableScripts: true
        }
        );

        panel.webview.html = getLoginContent();
        

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'alert':
                        //   vscode.window.showErrorMessage(message.textttt);
                        // vscode.window.showInformationMessage(message.host + message.username + message.password + message.config + Number(message.port));
                        vscode.commands.executeCommand("extension-to-3-0.helloWorld", message.host, message.username, message.password, message.config, Number(message.port));
                        
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
        
    }
}

// this method is called when your extension is deactivated
function deactivate() {
}

module.exports = {
    activate,
    deactivate
}

async function executeQuery(sql, cursor, if_print = false) {
    var start = new Date().getTime();
    var promise = cursor.query(sql, true);
    var end = new Date().getTime();
    let res = '';

    let test = await promise.then(function (result) {
        if (if_print) {
            
            console.log(result);
        }
        res = printSql(sql, result != null, (end - start));
        result.pretty();

        return res;
    });
    return test

}

async function executeSql(sql, affectRows, cursor) {
    var start = new Date().getTime();
    var promise = cursor.execute(sql);
    var end = new Date().getTime();

    return printSql(sql, promise == affectRows, (end - start));


}

function printSql(sql, succeed, cost) {
    console.log("[ " + (succeed ? "OK" : "ERROR!") + " ] time cost: " + cost + " ms, execute statement ====> " + sql);
    return "[ " + (succeed ? "OK" : "ERROR!") + " ] time cost: " + cost + " ms, execute statement ====> " + sql;
}
async function select_HTML(sql,cursor){
    var start = new Date().getTime();
    var promise = cursor.query(sql, true);
    var end = new Date().getTime();
    

    let test = await promise.then(function (result) {

        let res = ['','<thead><tr>','<tbody>',''];
        res[3] += '<div class="row"> <div class="col-sm-8 "><select class="form-select" id="sort_item" name="sort_item"><option value="default">Default</option>'
        res[0] = printSql(sql, result != null, (end - start));
        console.log(result);
        let fields = result['fields'];
        let data = result['data'];

        for(let i =0; i < fields.length;i++){
            res[1] += `<th > `+ String(fields[i]['name'])+`</th>`
            res[3] += `<option value="`+String(fields[i]['name'])+`">`+String(fields[i]['name'])+`</option>`
        }
        res[1] += `</tr></thead>`
        console.log(data);
        for (let i = 0;i< data.length;i++){
            
            let TaosRow_data = data[i]['data'];
            res[2] += "<tr>"
            for(let j = 0; j <TaosRow_data.length;j++){
                res[2] += "<td>"+ String(TaosRow_data[j])+"</td>"

            }

            res[2] += '</tr>'
        }
        res[2] += "</tbody>"
        res[3] += `</select></div><div class="col-sm-2 "><button type="button" class="btn btn-light" onclick="myFunction()">Sort by</button></div>`

        result.pretty();

        return res;
    });
    return `<table class="table table-dark table-striped table-hover">
    ` + test[1] + `
    ` + test[2] + `
    </table>`;

}

async function executeQuery_get_html(sql, cursor, if_print = false) {
    var start = new Date().getTime();
    var promise = cursor.query(sql, true);
    var end = new Date().getTime();
    let res = '';

    let test = await promise.then(function (result) {

        let res = ['','<thead><tr>','<tbody>',''];
        res[3] += '<div class="row"> <div class="col-sm-8 "><select class="form-select" id="sort_item" name="sort_item"><option value="default">Default</option>'
        res[0] = printSql(sql, result != null, (end - start));
        console.log(result);
        let fields = result['fields'];
        let data = result['data'];

        for(let i =0; i < fields.length;i++){
            res[1] += `<th > <div class="row"><div class="col-sm-7 ">`+ String(fields[i]['name'])+`</div>
            <div class="col-sm-1 "></div>
            <div class="col-sm-1 ">
            <button onclick='myFunction2("`+String(fields[i]['name'])+`")' type="button" class="btn btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-down" viewBox="0 0 16 16">
<path d="M3.5 2.5a.5.5 0 0 0-1 0v8.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L3.5 11.293V2.5zm3.5 1a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM7.5 6a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zm0 3a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z"/>
</svg>
          </button></div>
          <div class="col-sm-1 ">
          <button onclick='myFunction1("`+String(fields[i]['name'])+`")' type="button" class="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-down-alt" viewBox="0 0 16 16">
          <path d="M3.5 3.5a.5.5 0 0 0-1 0v8.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L3.5 12.293V3.5zm4 .5a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1h-1zm0 3a.5.5 0 0 1 0-1h3a.5.5 0 0 1 0 1h-3zm0 3a.5.5 0 0 1 0-1h5a.5.5 0 0 1 0 1h-5zM7 12.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7a.5.5 0 0 0-.5.5z"/>
          </svg>
        </button>
        </div></div>
        
          `+"</th>"
            res[3] += `<option value="`+String(fields[i]['name'])+`">`+String(fields[i]['name'])+`</option>`
        }
        // 
        // <svg  onclick='myFunction2("`+String(fields[i]['name'])+`")' xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-down" viewBox="0 0 16 16">
        //     <path d="M3.5 2.5a.5.5 0 0 0-1 0v8.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L3.5 11.293V2.5zm3.5 1a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zM7.5 6a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5zm0 3a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zm0 3a.5.5 0 0 0 0 1h1a.5.5 0 0 0 0-1h-1z"/>
        //     </svg>
        //     <svg onclick='myFunction1("`+String(fields[i]['name'])+`")' xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-down-alt" viewBox="0 0 16 16">
        //     <path d="M3.5 3.5a.5.5 0 0 0-1 0v8.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L3.5 12.293V3.5zm4 .5a.5.5 0 0 1 0-1h1a.5.5 0 0 1 0 1h-1zm0 3a.5.5 0 0 1 0-1h3a.5.5 0 0 1 0 1h-3zm0 3a.5.5 0 0 1 0-1h5a.5.5 0 0 1 0 1h-5zM7 12.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7a.5.5 0 0 0-.5.5z"/>
        //     </svg>
        res[1] += `</tr></thead>`
        console.log(data);
        for (let i = 0;i< data.length;i++){
            let TaosRow_data = data[i]['data'];
            res[2] += "<tr>"
            for(let j = 0; j <TaosRow_data.length;j++){
                res[2] += "<td>"+ String(TaosRow_data[j])+"</td>"

            }

            res[2] += '</tr>'
        }
        res[2] += "</tbody>"
        res[3] += `</select></div><div class="col-sm-2 "><button type="button" class="btn btn-light" onclick="myFunction()">Sort by</button></div>`

        result.pretty();

        return res;
    });

    return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  ` +""+`
      <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.staticfile.org/twitter-bootstrap/5.1.1/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.staticfile.org/twitter-bootstrap/5.1.1/js/bootstrap.bundle.min.js"></script>
  </head>
  <body style="background-color:rgba(0,0,0)" >
  <div class="bg-black text-white">
     <h3 >` + test[0] + `</h3>
     
     <table class="table table-dark table-striped table-hover">
	  ` + test[1] + `
      ` + test[2] + `
      </table>
      
      `+test[3]+`
      <div class="col-sm-2 ">
      <select class="form-select" id="order" name="order">
      <option value="ASC">Default</option>
      <option value="DESC">Reverse</option>
        </div>
      </div>
      
      
     
  
      <script>
      const vscode = acquireVsCodeApi();
      function myFunction()
      {   
          
          vscode.postMessage({
              command: 'alert',
              sort_item:document.getElementById("sort_item").value,
              order:document.getElementById("order").value,
          });
          document.getElementById("demo").innerHTML="配置有误，请重新尝试!";
      }
      function myFunction1(sortable)
      {   
          
          vscode.postMessage({
              command: 'sort_up',
              sort_i:sortable,
          });
          document.getElementById("demo").innerHTML="配置有误，请重新尝试!";
      }
      function myFunction2(sortable)
      {   
          
          vscode.postMessage({
              command: 'sort_down',
              sort_i:sortable,
          });
          document.getElementById("demo").innerHTML="配置有误，请重新尝试!";
      }
      </script>
  </body>
  </html>`;

}

function getLoginContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>

    <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.staticfile.org/twitter-bootstrap/5.1.1/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.staticfile.org/twitter-bootstrap/5.1.1/js/bootstrap.bundle.min.js"></script>
    <title>Config </title>
</head>
<body style="background-color:rgba(0,0,0)">
<div class="bg-black text-white">
    
    <div class="row">
	

	
	<div class="col-sm-3 p-3 "></div>
    
    <div class="col-sm-6 p-3">
    <img src="https://www.taosdata.com/wp-content/uploads/2022/02/site-logo.png" width="300" />
	<h2 id="demo">Please input: </h2>
    <table   class="table table-dark table-striped table-hover" style="width:500px" >
	<tr><td>host:</td><td><input id="host" type="text" value= "127.0.0.1" name="host"><br> </td></tr>
	<tr><td>user:</td>  <td><input id="username" type="text" value= "root" name="user"><br> </td></tr>
	<tr><td>Password: </td><td><input id = 'password' type="password" value= "taosdata" name="password"><br> </td></tr>
	<tr><td>config:</td><td><input id="config" type="text" value= "/etc/taos" name="config"><br> </td></tr>
	<tr><td>port:</td><td><input id="port" type="text" value= "0" name="port"><br></td></tr>
</table>
<button class="btn btn-light" type="button" onclick="myFunction()">Submit !</button>
</div>
    <div class="col-sm-3 p-3"></div>
	
</div>

</div>

    <script>
	const vscode = acquireVsCodeApi();
    function myFunction()
    {   
        
        vscode.postMessage({
            command: 'alert',
            textttt: 'Try submit ' + document.getElementById("username").value+' times',
			host: document.getElementById("host").value,
			username :document.getElementById("username").value,
			password :document.getElementById("password").value,
			config:document.getElementById("config").value,
			port : document.getElementById("port").value
        });

		document.getElementById("demo").innerHTML="Wrong, try again please.";
    }
    </script>
</body>
</html>`;
}

async function get_command_window(sql_res,sql_mem) {
    

    return `<!DOCTYPE html>
  <html lang="en">
  <head>

    <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.staticfile.org/twitter-bootstrap/5.1.1/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.staticfile.org/twitter-bootstrap/5.1.1/js/bootstrap.bundle.min.js"></script>
    <title>Command window</title>
</head>
  <body style="background-color:rgba(0,0,0)">
  <div class="bg-black text-white">
  <div class="row" >
    <div class="col-sm-8 " ><textarea style="height:300px;width:1000px;" id="sql_command" type="text" placeholder= "`+sql_mem+`" name="sql_command" ></textarea></div>
    
    </div>
    <div class="col-sm-4 "> <button class="btn btn-light" type="button" onclick="myFunction()">Excute sql</button></div>
	  ` + sql_res + `
  </div>
	  <script>
	const vscode = acquireVsCodeApi();
    function myFunction()
    {   
        
        vscode.postMessage({
            command: 'alert',
            sql_command:  document.getElementById("sql_command").value,
        });
    }
    </script>
  </body>
  </html>`;
  //     <textarea rows="4" placeholder="【注意】&#10;这是一段换行测试文本；&#10;换行；&#10;换行；&#10;换行；&#10;换行；">
// 
}

class TreeBaseShower {

    constructor(treedata) {
        this.treedata = treedata;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    delete() {
        this.treedata = {};
        this.refresh();
    }

    refresh() {
        console.log("refresh");
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    getChildren(element) {

        if (element) {
            let t1 = [];
            let arr = element.tba;

            for (let i = 0, len = arr.length; i < len; i++) {

                t1.push(new TableNode(arr[i], vscode.TreeItemCollapsibleState.None, element.label));

            }
            return t1;

        } else {
            let t1 = [];
            let dict = this.treedata;
            for (var db in dict) {

                t1.push(new BaseNode(db, vscode.TreeItemCollapsibleState.Collapsed, dict[db]))

            }

            return t1;
        }

        // return [t1];
    }
}

class BaseNode extends vscode.TreeItem {
    constructor(label, collapsibleState, table_arry) {
        super(label, collapsibleState);
        this.tba = table_arry;
        this.contextValue = "basenode";
        this.iconPath = path.join(__filename, '..', 'resources', 'dark', 'database.svg');
        
    }
}

class TableNode extends vscode.TreeItem {
    constructor(label, collapsibleState, frombase) {
        super(label, collapsibleState);
        this.frombase = frombase;
        this.contextValue = "tablenode";
        this.iconPath = path.join(__filename, '..', 'resources', 'table.svg');
    }
}

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));


async function get_database_list(cursor) {
    let sql_res = cursor.query("SHOW DATABASES;", true);
    let data_list = [];
    let test = await sql_res.then(function (result) {
        for (let i = 0; i < (result["data"]).length; i++) {
            data_list.push(String(result["data"][i]["data"][0]));
        }

    }).then(
        function (result) {
            data_list = data_list.slice(2);
            for (let db of data_list) {


            }
            return data_list;

        }
    );


    return test;
}

async function get_base_table(cursor) {
    // let res = []
    var promise = cursor.query("SHOW TABLES;", true);


    let res = await promise.then(function (result) {
        let res = []
        for (let i = 0; i < result['data'].length; i++) {
            if (i < 100) {
                // console.log(result['data'][i]['data'][0]);
                res.push(result['data'][i]['data'][0]);
            }

        }
        return res


    });
    console.log(res);
    return res
}

