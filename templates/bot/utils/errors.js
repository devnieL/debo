module.exports = {

  API_ERROR : {
    code : "API_ERROR",
    message : "Ocurrió un error al obtener los datos."
  },

  PROCESS_ERROR : {
    code : "PROCESS_ERROR",
    message : "Ocurrió un error al procesar los datos."
  },

  DB_ERROR : {
    code : "DB_ERROR",
    message : "Ocurrió un error al consultar los datos."
  },

  UNEXPECTED_ERROR : {
    code : "UNEXPECTED_ERROR",
    message : "Ocurrió un error inesperado."
  },

  WATSON_ERROR : {
    code : "WATSON_ERROR",
    message : "Ocurrió un error al procesar la respuesta."
  },
  
  conversations : {

    UNDEFINED_ID : {
      code : "UNDEFINED_ID",
      message : "El id de la conversación no es válido.",
    },

    WATSON_ID_NOT_FOUND : {
      code : "CONVERSATION__WATSON_ID_NOT_FOUND",
      message : "Ocurrió un error al crear la conversación"
    },

    USER_CHANNEL_NOT_FOUND : {
      code : "CONVERSATION__USER_CHANNEL_NOT_FOUND",
      message : "El canal de usuario de la conversación no es válido."
    },

    USER_NOT_FOUND_BY_ID_CARD : {
      code : "CONVERSATION__USER_NOT_FOUND_BY_ID_CARD",
      message : "El usuario no se encuentra en la base de datos."
    },

    USER_CELLPHONE_NOT_FOUND_IN_CONTEXT : {
      code : "CONVERSATION__USER_CELLPHONE_NOT_FOUND_IN_CONTEXT",
      message : "El teléfono celular no se encuentra registrado."
    },

    USER_CELLPHONE_IS_INVALID : {
      code : "CONVERSATION__USER_CELLPHONE_IS_INVALID",
      message : "El teléfono celular registrado es inválido."
    },

    USER_NOT_FOUND_IN_CONTEXT : {
      code : "CONVERSATION__USER_NOT_FOUND_IN_CONTEXT",
      message : "No se encontró información del usuario en el contexto."
    },

    NOT_FOUND : {
      code : "CONVERSATION__NOT_FOUND",
      message : "La conversación no existe."
    },

    INVALID_MESSAGE : {
      code : "INVALID_MESSAGE",
      message : "El mensaje recibido no es válido para ser procesado."
    }

  },

  users : {

    NOT_FOUND : {
      code : "NOT_FOUND",
      message : "El usuario no existe."
    },

    USER_CELLPHONE_AND_EMAIL_ARE_INVALID : {
      code : "USER_CELLPHONE_AND_EMAIL_ARE_INVALID",
      message : "El teléfono celular y correo electrónico registrados son inválidos"
    },

    INVALID_DATA : {
      code : "USER__INVALID_DATA",
      message : "Datos para usuario no válidos"
    },

    INVALID_ID : {
      code : "USER__INVALID_ID",
      message : "El id del usuario es inválido"
    },

    INVALID_ENABLED_PROPERTY : {
      code : "USER__INVALID_ENABLED_PROPERTY",
      message : "El valor de la propiedad 'enabled' del usuario es inválido"
    },

    INVALID_REGISTERED_PROPERTY : {
      code : "USER__INVALID_REGISTERED_PROPERTY",
      message : "El valor de la propiedad 'registered' del usuario es inválido"
    },

    INVALID_PAGE : {
      code : "USER__INVALID_PAGE",
      message : "Número de página inválido"
    },

    INVALID_QUANTITY : {
      code : "USER__INVALID_QUANTITY",
      message : "Cantidad de elementos por página inválido"
    },

    ALREADY_EXISTS : {
      code : "USER__ALREADY_EXISTS",
      message : "El usuario ya existe"
    }

  },

  channels : {

    NOT_FOUND : {
      code : "CHANNEL__NOT_FOUND",
      message : "Canal no encontrado"
    },

    INVALID_DATA : {
      code : "CHANNEL__INVALID_DATA",
      message : "Datos para canal no válidos"
    },

    INVALID_ID : {
      code : "CHANNEL__INVALID_ID",
      message : "El id del canal es inválido"
    },

    INVALID_CODE_PROPERTY : {
      code : "CHANNEL__INVALID_CODE_PROPERTY",
      message : "El código del canal es inválido"
    },

    INVALID_TYPE_PROPERTY : {
      code : "CHANNEL_INVALID_TYPE_PROPERTY",
      message : "El tipo de canal es inválido"
    },

    INVALID_ENABLED_PROPERTY : {
      code : "CHANNEL__INVALID_ENABLED_PROPERTY",
      message : "El valor de la propiedad 'enabled' del canal es inválido"
    },

    INVALID_PAGE : {
      code : "CHANNEL__INVALID_PAGE",
      message : "Número de página inválido"
    },

    INVALID_QUANTITY : {
      code : "CHANNEL__INVALID_QUANTITY",
      message : "Cantidad de elementos por página inválido"
    },

    ALREADY_EXISTS : {
      code : "CHANNEL__ALREADY_EXISTS",
      message : "El canal ya existe"
    }


  },

  messages : {

    INVALID_DATA : {
      code : "MESSAGE__INVALID_DATA",
      message : "Datos para mensaje no válidos"
    },

    NOT_FOUND : {
      code : "MESSAGE__NOT_FOUND",
      message : "Mensaje no encontrado"
    },

    INVALID_ID : {
      code : "MESSAGE__INVALID_ID",
      message : "El id del proceso de conversación es inválido"
    },

    INVALID_PAGE : {
      code : "MESSAGE__INVALID_PAGE",
      message : "Número de página inválido"
    },

    INVALID_QUANTITY : {
      code : "MESSAGE__INVALID_QUANTITY",
      message : "Cantidad de elementos por página inválido"
    }

  },

  user_channels : {

    NOT_FOUND : {
      code : "NOT_FOUND",
      message : "El canal del usuario no existe."
    }
  }

}
