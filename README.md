# DEBO

A boilerplate to create multichannel bots powered by IBM Watson, channels currently available: Facebook Messenger, Twitter and Web.

Usage:

1. First install the module (not yet available on NPM) so clone it and run the following command in the folder:

````
npm install -g .
````

2. The **debo** command is globally available, now you can create your bot projects:

````
> debo [BOT_NAME]
````

A folder will be created with the debo boilerplate, by default the name is ***my-debo***.

3. The boilerplate includes an ***schema*** file that should be restored on a postgresql schema named as **bot**.

4. The boilerplate also includes the base conversation dialog workspace that should be uploaded on an **IBM Watson Conversation** instance.

5. All the credentials need to be included in the proper **.env** file.