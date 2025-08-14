# Documentação da Evolution API v2

## Índice

- [Get Information](#get-information)
- [Set Webhook](#set-webhook)
- [Set Settings](#set-settings)
- [Find Settings](#find-settings)
- [Find Webhook](#find-webhook)
- [Update Block Status](#update-block-status)
- [Send Contact](#send-contact)
- [Send Sticker](#send-sticker)
- [Find sessions OpenAI](#find-sessions-openai)
- [Leave Group](#leave-group)
- [Find SQS](#find-sqs)
- [Send Poll](#send-poll)
- [Fetch Instances](#fetch-instances)
- [Archive Chat](#archive-chat)
- [Fetch Profile](#fetch-profile)
- [Find Dify Settings](#find-dify-settings)
- [Update Group Members](#update-group-members)
- [Send WhatsApp Audio](#send-whatsapp-audio)
- [Create Group](#create-group)
- [Find Typebot](#find-typebot)
- [Set RabbitMQ](#set-rabbitmq)
- [Find Status Bot](#find-status-bot)
- [Set Presence](#set-presence)
- [Set Settings Flowise Bots](#set-settings-flowise-bots)
- [Find Evolution Bots](#find-evolution-bots)
- [Delete OpenIA Bot](#delete-openia-bot)
- [Fetch Typebot](#fetch-typebot)
- [Send List](#send-list)
- [Change status OpenAI](#change-status-openai)
- [Send Status](#send-status)

## Get Information

### Description
Get information about your EvolutionAPI.

### HTTP Method
GET

### Endpoint Path
/

### Parameters

| Name      | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| instance  | string | Yes      | ID of the instance to connect |

### Example Request
```
curl --request GET \
  --url https://{server-url}/
```

### Example Response
```
{
  "status": 200,
  "message": "Welcome to the Evolution API, it is working!",
  "version": "1.7.4",
  "swagger": "http://example.evolution-api.com/docs",
  "manager": "http://example.evolution-api.com/manager",
  "documentation": "https://doc.evolution-api.com"
}
```

### Response
- **Status Code:** 200
- **Content Type:** application/json
- **Description:** Ok
- **Type:** object

## Set Webhook

### Description
Set Webhook

### HTTP Method
POST

### Endpoint Path
/webhook/set/{instance}

### Parameters

#### Path Parameters
| Name      | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| instance  | string | Yes      | Name of the instance |

#### Headers
| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header   |

### Authorizations
- apikey: string, header, required

### Request
#### Example Request
```bash
curl --request POST \
  --url https://{server-url}/webhook/set/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "enabled": true,
  "url": "<string>",
  "webhookByEvents": true,
  "webhookBase64": true,
  "events": [
    "APPLICATION_STARTUP"
  ]
}'
```

#### Body
- Content-Type: application/json

### Response
#### Example Response
```json
{
  "webhook": {
    "instanceName": "teste-docs",
    "webhook": {
      "url": "https://example.com",
      "events": [
        "APPLICATION_STARTUP"
      ],
      "enabled": true
    }
  }
}
```

#### Status Code
- 201 - Created
- Response Type: application/json, object

## Set Settings

### Description
Set Settings

### HTTP Method
POST

### Endpoint Path
/https://{server-url}/settings/set/{instance}

### Parameters

#### Path Parameters

| Name      | Type   | Required | Description         |
|-----------|--------|----------|---------------------|
| instance  | string | Yes      | Name of the instance |

#### Headers

| Name      | Type   | Required | Description                   |
|-----------|--------|----------|-------------------------------|
| apikey    | string | Yes      | Your authorization key header |
| Content-Type | string | Yes      | application/json             |

### Example Request
```bash
curl --request POST \
  --url https://{server-url}/settings/set/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "rejectCall": true,
  "msgCall": "<string>",
  "groupsIgnore": true,
  "alwaysOnline": true,
  "readMessages": true,
  "readStatus": true,
  "syncFullHistory": true
}'
```

### Example Response
```json
{
  "settings": {
    "instanceName": "teste-docs",
    "settings": {
      "reject_call": true,
      "groups_ignore": true,
      "always_online": true,
      "read_messages": true,
      "read_status": true,
      "sync_full_history": false
    }
  }
}
```

### Response Details
- **Status Code:** 201
- **Content Type:** application/json
- **Description:** Created
- **Type:** object

## Find Settings

### Description
Find Webhook

### HTTP Method
GET

### Endpoint Path
/settings/find/{instance}

### Parameters

#### Path Parameters

| Name      | Type   | Description                     | Required |
|-----------|--------|---------------------------------|----------|
| instance  | string | Name of the instance to get settings | Yes      |

#### Headers

| Name      | Type   | Description                     | Required |
|-----------|--------|---------------------------------|----------|
| apikey    | string | Your authorization key header   | Yes      |

### Example Request
```
curl --request GET \
  --url https://{server-url}/settings/find/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
```json
{
  "reject_call": true,
  "groups_ignore": true,
  "always_online": true,
  "read_messages": true,
  "read_status": true,
  "sync_full_history": false
}
```

### Response Details
- **Status Code**: 200
- **Content Type**: application/json
- **Description**: Ok
- **Response Type**: object

## Find Webhook

### Description
Find Webhook

### HTTP Method
GET

### Endpoint Path
/webhook/find/{instance}

### Parameters

### Path Parameters
| Name      | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| instance  | string | Yes      | Name of the instance   |

### Headers
| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header   |

### Example Request
```
curl --request GET \
  --url https://{server-url}/webhook/find/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
```
{
  "enabled": true,
  "url": "https://example.com",
  "events": [
    "APPLICATION_STARTUP"
  ]
}
```

### Response
- **Status Code:** 200
- **Content Type:** application/json
- **Description:** Ok
- **Type:** object

## Update Block Status

### Description
Update block status

### HTTP Method
POST

### Endpoint Path
/message/updateBlockStatus/{instance}

### Parameters

#### Path Parameters
| Name      | Type   | Required | Description         |
|-----------|--------|----------|---------------------|
| instance  | string | Yes      | Name of the instance |

### Headers
| Name      | Type   | Required | Description                   |
|-----------|--------|----------|-------------------------------|
| apikey    | string | Yes      | Your authorization key header |

### Body
`application/json`

| Name     | Type   | Required | Description |
|----------|--------|----------|-------------|
| number   | string | Yes      |             |
| status   | string | Yes      |             |

### Example Request
```
curl --request POST \
  --url https://{server-url}/message/updateBlockStatus/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "number": "<string>",
  "status": "<string>"
}'
```

### Example Response
No example response provided in the content.

### Additional Details
- Responses are generated using AI and may contain mistakes.

## Send Contact

### Description
Send Contact

### HTTP Method
POST

### Endpoint Path
/message/sendContact/{instance}

### Parameters

#### Path Parameters

| Name      | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| instance  | string | Yes      | Name of the instance |

### Headers

| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header   |
| Content-Type | string | Yes      | Must be application/json        |

### Example Request
```bash
curl --request POST \
  --url https://{server-url}/message/sendContact/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "number": "<string>",
  "contact": [
    {
      "fullName": "<string>",
      "wuid": "<string>",
      "phoneNumber": "<string>",
      "organization": "<string>",
      "email": "<string>",
      "url": "<string>"
    }
  ]
}'
```

### Example Response
```json
{
  "key": {
    "remoteJid": "553198296801@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE58DA6CBC941BC"
  },
  "message": {
    "contactMessage": {
      "displayName": "Guilherme Gomes",
      "vcard": "BEGIN:VCARD\nVERSION:3.0\nN:Guilherme Gomes\nFN:Guilherme Gomes\nORG:AtendAI;\nEMAIL:...",
      "contextInfo": {}
    }
  },
  "messageTimestamp": "1717780437",
  "status": "PENDING"
}
```

### Response Details
- Status Code: 201
- Content Type: application/json
- Description: Created
- Response Type: object

## Send Sticker

### Description
Send Sticker

### HTTP Method
POST

### Endpoint Path
/message/sendSticker/{instance}

### Parameters

### Authorizations
| Name     | Type   | Location | Required | Description                |
|----------|--------|----------|----------|----------------------------|
| apikey   | string | header   | Yes      | Your authorization key header |

### Path Parameters
| Name     | Type   | Required | Description          |
|----------|--------|----------|----------------------|
| instance | string | Yes      | Name of the instance |

### Body
| Name             | Type      | Description                     |
|------------------|-----------|---------------------------------|
| number           | string    |                                 |
| sticker          | string    |                                 |
| delay            | integer   |                                 |
| linkPreview      | boolean   |                                 |
| mentionsEveryOne | boolean   |                                 |
| mentioned        | array     | Array of strings, e.g., "{{remoteJID}}" |
| quoted           | object    | Object containing key and message |

#### Example Body
```json
{
  "number": "<string>",
  "sticker": "<string>",
  "delay": 123,
  "linkPreview": true,
  "mentionsEveryOne": true,
  "mentioned": [
    "{{remoteJID}}"
  ],
  "quoted": {
    "key": {
      "id": "<string>"
    },
    "message": {
      "conversation": "<string>"
    }
  }
}
```

### Example Request
```
curl --request POST \
  --url https://{server-url}/message/sendSticker/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "number": "<string>",
  "sticker": "<string>",
  "delay": 123,
  "linkPreview": true,
  "mentionsEveryOne": true,
  "mentioned": [
    "{{remoteJID}}"
  ],
  "quoted": {
    "key": {
      "id": "<string>"
    },
    "message": {
      "conversation": "<string>"
    }
  }
}'
```

### Example Response
Assistant

Responses are generated using AI and may contain mistakes.

## Find sessions OpenAI

### Description
Fetch sessions of the OpenAI bot instance

### HTTP Method
GET

### Endpoint Path
/openai/fetchSessions/:openaiBotId/{instance}

### Parameters

### Path Parameters

| Parameter    | Type   | Required | Description              |
|--------------|--------|----------|--------------------------|
| openaiBotId  | string | Yes      | ID of the OpenAI bot     |
| instance     | string | Yes      | Name of the instance     |

### Headers

| Parameter  | Type   | Required | Description                  |
|------------|--------|----------|------------------------------|
| apikey     | string | Yes      | Your authorization key header|

### Example Request
```
curl --request GET \
  --url https://{server-url}/openai/fetchSessions/:openaiBotId/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
```
{
  "message": "OK"
}
```

### Response
### 200
**Content Type:** application/json  
**Description:** Successfully fetched sessions  
**Type:** object

## Leave Group

### Description
Leave Group

### HTTP Method
DELETE

### Endpoint Path
/group/leaveGroup/{instance}

### Parameters

### Path Parameters
| Name      | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| instance  | string | Yes      | Name of the instance |

### Query Parameters
| Name      | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| groupJid  | string | Yes      | Group remote JID          |

### Headers
| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header  |

### Example Request
```
curl --request DELETE \
  --url https://{server-url}/group/leaveGroup/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
No example response provided in the content.

### Additional Details
- Responses are generated using AI and may contain mistakes.

## Find SQS

### Description
Find SQS

### HTTP Method
GET

### Endpoint Path
/sqs/find/{instance}

### Parameters

#### Path Parameters

| Name      | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| instance  | string | Yes      | Name of the instance   |

### Headers

| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header   |

### Example Request
```
curl --request GET \
  --url https://{server-url}/sqs/find/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
Insufficient relevant content - The provided content does not include an example response.

### Additional Details
Responses are generated using AI and may contain mistakes.

## Send Poll

### Description
Send Poll

### HTTP Method
POST

### Endpoint Path
/message/sendPoll/{instance}

### Parameters

### Path Parameters

| Name      | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| instance  | string | Yes      | Name of the instance |

### Headers

| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header  |
| Content-Type | string | Yes      | application/json               |

### Example Request
```bash
curl --request POST \
  --url https://{server-url}/message/sendPoll/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "number": "<string>",
  "name": "<string>",
  "selectableCount": 123,
  "values": [
    "Question 1"
  ],
  "delay": 123,
  "linkPreview": true,
  "mentionsEveryOne": true,
  "mentioned": [
    "{{remoteJID}}"
  ],
  "quoted": {
    "key": {
      "id": "<string>"
    },
    "message": {
      "conversation": "<string>"
    }
  }
}'
```

### Example Response
```json
{
  "key": {
    "remoteJid": "553198296801@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE53EC8D8E1FD8A"
  },
  "message": {
    "messageContextInfo": {
      "messageSecret": "lX/+cLHHNfnTTKZi+88mrhoyi6KNuUzWjgfaB0bTfOY="
    },
    "pollCreationMessage": {
      "name": "Poll Name",
      "options": [
        {
          "optionName": "Option 1"
        },
        {
          "optionName": "Option 2"
        },
        {
          "optionName": "Option 3"
        }
      ],
      "selectableOptionsCount": 1
    }
  },
  "messageTimestamp": "1717781848",
  "status": "PENDING"
}
```

### Response Details
- Status Code: 201
- Content Type: application/json
- Description: Created
- Response Type: object

## Fetch Instances

### Description
Fetch Instances

### HTTP Method
GET

### Endpoint Path
/instance/fetchInstances

### Parameters

### Authorizations
| Name     | Type   | Location | Required | Description                  |
|----------|--------|----------|----------|------------------------------|
| apikey   | string | header   | Yes      | Your authorization key header |

### Query Parameters
| Name        | Type   | Description                     |
|-------------|--------|---------------------------------|
| instanceName| string | Name of the instance to be fetched |
| instanceId  | string | ID of the instance to be fetched  |

### Example Request
```
curl --request GET \
  --url https://{server-url}/instance/fetchInstances \
  --header 'apikey: <api-key>'
```

### Example Response
```
[
  {
    "instance": {
      "instanceName": "example-name",
      "instanceId": "421a4121-a3d9-40cc-a8db-c3a1df353126",
      "owner": "553198296801@s.whatsapp.net",
      "profileName": "Guilherme Gomes",
      "profilePictureUrl": null,
      "profileStatus": "This is the profile status.",
      "status": "open",
      "serverUrl": "https://example.evolution-api.com",
      "apikey": "B3844804-481D-47A4-B69C-F14B4206EB56",
      "integration": {
        "integration": "WHATSAPP-BAILEYS",
        "webhook_wa_business": "https://example.evolution-api.com/webhook/whatsapp/db5e11d3-ded5-4d91-b3fb-48272688f206"
      }
    }
  },
  {
    "instance": {
      "instanceName": "teste-docs",
      "instanceId": "af6c5b7c-ee27-4f94-9ea8-192393746ddd",
      "status": "close",
      "serverUrl": "https://example.evolution-api.com",
      "apikey": "123456",
      "integration": {
        "token": "123456",
        "webhook_wa_business": "https://example.evolution-api.com/webhook/whatsapp/teste-docs"
      }
    }
  }
]
```

### Response
- **200** - application/json
  - Description: Ok
  - Type: object

## Archive Chat

### Description
Archive Chat

### HTTP Method
POST

### Endpoint Path
/https://{server-url}/chat/archiveChat/{instance}

### Parameters

### Path Parameters

| Name      | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| instance  | string | Yes      | Name of the instance |

### Headers

| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header   |
| Content-Type | string | Yes      | application/json                |

### Example Request
```bash
curl --request POST \
  --url https://{server-url}/chat/archiveChat/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "lastMessage": {
    "key": {
      "remoteJid": "<string>",
      "fromMe": true,
      "id": "<string>"
    }
  },
  "archive": true,
  "chat": "<string>"
}'
```

### Example Response
```json
{
  "chatId": "553198296801@s.whatsapp.net",
  "archived": true
}
```

### Response Details
- **Status Code:** 201
- **Content Type:** application/json
- **Description:** Created
- **Description:** Created
- **Response Type:** object

### Authorizations
- apikey: string, header, required, Your authorization key header

### Body
- Content Type: application/json

## Fetch Profile

### Description
Fetch Business Profile

### HTTP Method
POST

### Endpoint Path
/chat/fetchProfile/{instance}

### Parameters

### Path Parameters
| Name      | Type   | Required | Description         |
|-----------|--------|----------|---------------------|
| instance  | string | Yes      | Name of the instance |

### Headers
| Name      | Type   | Required | Description                   |
|-----------|--------|----------|-------------------------------|
| apikey    | string | Yes      | Your authorization key header |
| Content-Type | string | Yes      | application/json              |

### Body
application/json

### Example Request
```
curl --request POST \
  --url https://{server-url}/chat/fetchProfile/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "number": "<string>"
}'
```

### Example Response
No example response provided in the content.

### Additional Details
- Responses are generated using AI and may contain mistakes.

## Find Dify Settings

### Description
Find settings dify bot

### HTTP Method
GET

### Endpoint Path
/dify/fetchSettings/{instance}

### Parameters

### Path Parameters

| Name      | Type   | Required | Description         |
|-----------|--------|----------|---------------------|
| instance  | string | Yes      | Nome da instância   |

### Headers

| Name      | Type   | Required | Description                 |
|-----------|--------|----------|-----------------------------|
| apikey    | string | Yes      | Your authorization key header |

### Example Request
```
curl --request GET \
  --url https://{server-url}/dify/fetchSettings/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
```
{
  "message": "Configurações do bot Dify atualizadas com sucesso"
}
```

### Response
- **Status Code:** 200
- **Content Type:** application/json
- **Description:** Configurações do bot Dify atualizadas com sucesso.
- **Type:** object

## Update Group Members

### Description
Update Group Members

### HTTP Method
POST

### Endpoint Path
/group/updateParticipant/{instance}

### Parameters

### Path Parameters
| Name      | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| instance  | string | Yes      | Name of the instance |

### Query Parameters
| Name      | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| groupJid  | string | Yes      | Group remote JID          |

### Headers
| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header  |
| Content-Type | string | Yes      | application/json               |

### Example Request
```
curl --request POST \
  --url https://{server-url}/group/updateParticipant/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "action": "add",
  "participants": [
    "<string>"
  ]
}'
```

### Example Response
No example response provided in the content.

### Additional Details
- Responses are generated using AI and may contain mistakes.

## Send WhatsApp Audio

### Description
Send WhatsApp Audio

### HTTP Method
POST

### Endpoint Path
/message/sendWhatsAppAudio/{instance}

### Parameters

### Authorizations
| Name     | Type   | Location | Required | Description                  |
|----------|--------|----------|----------|------------------------------|
| apikey   | string | header   | Yes      | Your authorization key header |

### Path Parameters
| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| instance  | string | Yes      | ID of the instance to connect   |

### Body
application/json

### Example Request
```
curl --request POST \
  --url https://{server-url}/message/sendWhatsAppAudio/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "number": "<string>",
  "audio": "<string>",
  "delay": 123,
  "linkPreview": true,
  "mentionsEveryOne": true,
  "mentioned": [
    "{{remoteJID}}"
  ],
  "quoted": {
    "key": {
      "id": "<string>"
    },
    "message": {
      "conversation": "<string>"
    }
  }
}'
```

### Example Response
```
{
  "key": {
    "remoteJid": "553198296801@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE5EFED2AB0BB9F"
  },
  "message": {
    "audioMessage": {
      "url": "https://mmg.whatsapp.net/v/t62.7114-24/21428511_985284763127087_5662928...",
      "mimetype": "audio/mp4",
      "fileSha256": "DJPBnRns6QADzZNH2j0R88mUtFQ4aiOm9aZf6dio2G0=",
      "fileLength": "670662",
      "seconds": 42,
      "ptt": true,
      "mediaKey": "+A3X1Tuyzeh87cCVZpfuKpL3Y4RYdYr3sCDurjSlBTY=",
      "fileEncSha256": "s4tKvHOXIZAw5668/Xcy4zoFba4vW8klmNYC78yOPZs=",
      "directPath": "/v/t62.7114-24/21428511_985284763127087_5662928477636351284_n.enc...",
      "mediaKeyTimestamp": "1717776942"
    }
  },
  "messageTimestamp": "1717776942",
  "status": "PENDING"
}
```

### Response Details
- Status Code: 200
- Content Type: application/json
- Description: Ok
- Response Type: object

## Create Group

### Description
Create Group

### HTTP Method
POST

### Endpoint Path
/group/create/{instance}

### Parameters

### Path Parameters

| Name      | Type   | Required | Description         |
|-----------|--------|----------|---------------------|
| instance  | string | Yes      | Name of the instance |

### Headers

| Name      | Type   | Required | Description                   |
|-----------|--------|----------|-------------------------------|
| apikey    | string | Yes      | Your authorization key header |

### Example Request
```
curl --request POST \
  --url https://{server-url}/group/create/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "subject": {},
  "description": "<string>",
  "participants": [
    "<string>"
  ]
}'
```

### Example Response
No example response provided in the content.

### Body
application/json

### Notes
Responses are generated using AI and may contain mistakes.

## Find Typebot

### Description
Find Typebot

### HTTP Method
GET

### Endpoint Path
/typebot/find/{instance}

### Parameters

### Authorizations
| Name    | Type   | Location | Required | Description              |
|---------|--------|----------|----------|--------------------------|
| apikey  | string | header   | Yes      | Your authorization key header |

### Path Parameters
| Name     | Type   | Required | Description         |
|----------|--------|----------|---------------------|
| instance | string | Yes      | Name of the instance |

### Example Request
```
curl --request GET \
  --url https://{server-url}/typebot/find/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
Responses are generated using AI and may contain mistakes.

### Additional Details
None provided.

## Set RabbitMQ

### Description
Set RabbitMQ

### HTTP Method
POST

### Endpoint Path
/rabbitmq/set/{instance}

### Parameters

### Path Parameters

| Name      | Type   | Description         | Required |
|-----------|--------|---------------------|----------|
| instance  | string | Name of the instance | Yes      |

### Headers

| Name      | Type   | Description                     | Required |
|-----------|--------|---------------------------------|----------|
| apikey    | string | Your authorization key header   | Yes      |
| Content-Type | string | Set to application/json         | Implicit |

### Example Request
```
curl --request POST \
  --url https://{server-url}/rabbitmq/set/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "rabbitmq": {
    "enabled": true,
    "events": [
      "APPLICATION_STARTUP"
    ]
  }
}'
```

### Example Response
Insufficient relevant content: The provided content does not include an example response.

### Additional Details
- Responses are generated using AI and may contain mistakes.

## Find Status Bot

### Description
Recupera as sessões ativas do bot Dify.

### HTTP Method
GET

### Endpoint Path
/dify/fetchSessions/:difyId/{instance}

### Parameters

### Path Parameters

| Name      | Type   | Description                | Required |
|-----------|--------|----------------------------|----------|
| difyId    | string | ID único do bot Dify.      | Yes      |
| instance  | string | Nome da instância.         | Yes      |

### Headers

| Name      | Type   | Description                       | Required |
|-----------|--------|-----------------------------------|----------|
| apikey    | string | Your authorization key header     | Yes      |

### Example Request
```
curl --request GET \
  --url https://{server-url}/dify/fetchSessions/:difyId/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
```
{
  "sessions": "<string>"
}
```

### Response
### 200 - application/json
Sessões recuperadas com sucesso.

The response is of type `object`.

## Set Presence

### Description
Set Presence

### HTTP Method
POST

### Endpoint Path
/instance/setPresence/{instance}

### Parameters

### Path Parameters
| Name      | Type   | Description                | Required |
|-----------|--------|----------------------------|----------|
| instance  | string | Name of the instance to connect | Yes      |

### Headers
| Name      | Type   | Description                        | Required |
|-----------|--------|------------------------------------|----------|
| apikey    | string | Your authorization key header     | Yes      |
| Content-Type | string | Set to application/json           | Implicit |

### Example Request
```
curl --request POST \
  --url https://{server-url}/instance/setPresence/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "presence": "available"
}'
```

### Example Response
This response has no body data.

### Authorizations
- apikey: string, header, required, Your authorization key header

### Body
application/json

## Set Settings Flowise Bots

### Description
Set as configurações do Flowise

### HTTP Method
POST

### Endpoint Path
/https://{server-url}/flowise/settings/{instance}

### Parameters

### Path Parameters
| Name      | Type   | Required | Description         |
|-----------|--------|----------|---------------------|
| instance  | string | Yes      | Nome da instância   |

### Headers
| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header   |

### Body
application/json  
Configuração para atualizar as preferências da instância do Flowise  
The body is of type `object`.

Example:
```json
{
  "expire": 20,
  "keywordFinish": "#SAIR",
  "delayMessage": 1000,
  "unknownMessage": "Mensagem não reconhecida",
  "listeningFromMe": false,
  "stopBotFromMe": false,
  "keepOpen": false,
  "debounceTime": 0,
  "ignoreJids": [],
  "flowiseIdFallback": "clyja4oys0a3uqpy7k3bd7swe"
}
```

### Example Request
```
curl --request POST \
  --url https://{server-url}/flowise/settings/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "expire": 20,
  "keywordFinish": "#SAIR",
  "delayMessage": 1000,
  "unknownMessage": "Mensagem não reconhecida",
  "listeningFromMe": false,
  "stopBotFromMe": false,
  "keepOpen": false,
  "debounceTime": 0,
  "ignoreJids": [],
  "flowiseIdFallback": "clyja4oys0a3uqpy7k3bd7swe"
}'
```

### Example Response
```json
{
  "message": "Configurações da instância do Flowise atualizadas com sucesso"
}
```

### Response
200 - application/json  
Configurações da instância do Flowise atualizadas com sucesso  
The response is of type `object`.

## Find Evolution Bots

### Description
Find Bots Evo

### HTTP Method
GET

### Endpoint Path
/evolutionBot/find/{instance}

### Parameters

| Name      | Type   | Description             | Required | Location |
|-----------|--------|-------------------------|----------|----------|
| apikey    | string | Your authorization key header | Yes      | header   |
| instance  | string | Name of the instance    | Yes      | path     |

### Example Request
```
curl --request GET \
  --url https://{server-url}/evolutionBot/find/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
```
{
  "message": "OK"
}
```

### Response
- **200 - application/json**: Successfully fetched sessions
  - Type: object

### Authorizations
- apikey: string, header, required, Your authorization key header

### Notes
Responses are generated using AI and may contain mistakes.

## Delete OpenIA Bot

### Description
Delete OpenAI Bot

### HTTP Method
DELETE

### Endpoint Path
/openai/delete/:openaiBotId/{instance}

### Parameters

| Parameter      | Type   | Description              | Required | Location  |
|----------------|--------|--------------------------|----------|-----------|
| apikey         | string | Your authorization key header | Yes      | header    |
| instance       | string | Name of the instance     | Yes      | path      |
| openaiBotId    | string | ID of the bot            | Yes      | path      |

### Example Request
```
curl --request DELETE \
  --url https://{server-url}/openai/delete/:openaiBotId/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
No example response provided in the content.

### Additional Details
- Responses are generated using AI and may contain mistakes.

## Fetch Typebot

### Description
Find Typebot

### HTTP Method
GET

### Endpoint Path
/typebot/fetch/:typebotId/{instance}

### Parameters

### Path Parameters

| Name       | Type   | Required | Description          |
|------------|--------|----------|----------------------|
| instance   | string | Yes      | Name of the instance |
| typebotId  | string | Yes      | ID of the typebot    |

### Headers

| Name      | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| apikey    | string | Yes      | Your authorization key header|

### Example Request
```
curl --request GET \
  --url https://{server-url}/typebot/fetch/:typebotId/{instance} \
  --header 'apikey: <api-key>'
```

### Example Response
No example response provided in the content.

### Additional Details
Responses are generated using AI and may contain mistakes.

## Send List

### Description
Send List

### HTTP Method
POST

### Endpoint Path
/message/sendList/{instance}

### Parameters

### Path Parameters

| Name      | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| instance  | string | Yes      | Name of the instance |

### Headers

| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header  |
| Content-Type | string | Yes      | Must be `application/json`     |

### Example Request
```bash
curl --request POST \
  --url https://{server-url}/message/sendList/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "number": "<string>",
  "title": "<string>",
  "description": "<string>",
  "buttonText": "<string>",
  "footerText": "<string>",
  "values": [
    {
      "title": "<string>",
      "rows": [
        {
          "title": "<string>",
          "description": "<string>",
          "rowId": "<string>"
        }
      ]
    }
  ],
  "delay": 123,
  "linkPreview": true,
  "mentionsEveryOne": true,
  "mentioned": [
    "{{remoteJID}}"
  ],
  "quoted": {
    "key": {
      "id": "<string>"
    },
    "message": {
      "conversation": "<string>"
    }
  }
}'
```

### Example Response
```json
{
  "key": {
    "remoteJid": "553198296801@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE53EC8D8E1FD8A"
  },
  "message": {
    "messageContextInfo": {
      "messageSecret": "lX/+cLHHNfnTTKZi+88mrhoyi6KNuUzWjgfaB0bTfOY="
    },
    "pollCreationMessage": {
      "name": "Poll Name",
      "options": [
        {
          "optionName": "Option 1"
        },
        {
          "optionName": "Option 2"
        },
        {
          "optionName": "Option 3"
        }
      ],
      "selectableOptionsCount": 1
    }
  },
  "messageTimestamp": "1717781848",
  "status": "PENDING"
}
```

### Response Details
- Status Code: 201
- Content Type: application/json
- Description: Created
- Response Type: object

## Change status OpenAI

### Description
Change OpenAI Bot Status

### HTTP Method
POST

### Endpoint Path
/openai/changeStatus/{instance}

### Parameters

### Path Parameters

| Name      | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| instance  | string | Yes      | Name of the instance |

### Headers

| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header  |

### Example Request
```bash
curl --request POST \
  --url https://{server-url}/openai/changeStatus/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "remoteJid": "<string>",
  "status": "opened"
}'
```

### Example Response
```json
{
  "success": true,
  "message": "<string>"
}
```

### Body
application/json

Body for changing the status of the OpenAI Bot

The body is of type `object`.

### Response
200 - application/json

Successfully changed the bot status

The response is of type `object`.

### Authorizations
- apikey: string, header, required, Your authorization key header

## Send Status

### Description
Send Status

### HTTP Method
POST

### Endpoint Path
/message/sendStatus/{instance}

### Parameters

### Path Parameters
| Name      | Type   | Required | Description            |
|-----------|--------|----------|------------------------|
| instance  | string | Yes      | Name of the instance   |

### Headers
| Name      | Type   | Required | Description                     |
|-----------|--------|----------|---------------------------------|
| apikey    | string | Yes      | Your authorization key header   |
| Content-Type | string | Yes      | application/json               |

### Example Request
```bash
curl --request POST \
  --url https://{server-url}/message/sendStatus/{instance} \
  --header 'Content-Type: application/json' \
  --header 'apikey: <api-key>' \
  --data '{
  "type": "text",
  "content": "<string>",
  "caption": "<string>",
  "backgroundColor": "<string>",
  "font": 123,
  "allContacts": true,
  "statusJidList": [
    "{{remoteJID}}"
  ]
}'
```

### Example Response
```json
{
  "key": {
    "remoteJid": "status@broadcast",
    "fromMe": true,
    "id": "BAE5FAB9E65A3DA8"
  },
  "message": {
    "extendedTextMessage": {
      "text": "example",
      "backgroundArgb": 4294910617,
      "font": "FB_SCRIPT"
    }
  },
  "messageTimestamp": "1717691767",
  "status": "PENDING",
  "participant": "553198296801:17@s.whatsapp.net"
}
```

### Response Details
- **Status Code:** 201
- **Content Type:** application/json
- **Description:** Created
- **Response Type:** object