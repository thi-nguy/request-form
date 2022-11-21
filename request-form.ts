import { ConfigurationPayload } from '../common/models/configuration_payload';
import { Person } from '../common/models/person';
import { RequestFormValues } from '../components/FormDrawer';
import { MAILCHIMP_API_KEY, MAILCHIMP_API_URI } from '../environments/environment';
import { userName } from '../utils/user';

interface TemplateContent {
  name: string;
  content: string;
}

interface Message {
  key: string;
  template_name: string;
  template_content: TemplateContent[];
  message: {
    from_email: string;
    subject: string;
    to: {
      email: string;
      type: string;
    }[];
    merge_language: string;
    global_merge_vars: TemplateContent[];
  };
}

export const postRequestForm = async (values: RequestFormValues, user: Person, application?: ConfigurationPayload) => {
  const template_content_report = serializeTemplateContent(values, user, true, application);
  const message_report = serializeMessage(values, user, template_content_report, true, application);
  const template_content_confirm = serializeTemplateContent(values, user, false, application);
  const message_confirm = serializeMessage(values, user, template_content_confirm, false, application);

  return postEmail(message_report, message_confirm);
};

const serializeTemplateContent = (
  values: RequestFormValues,
  user: Person,
  isReport: boolean,
  application?: ConfigurationPayload,
) => {
  if (isReport) {
    if (application) {
      const template_content = [
        { name: 'first_name', content: user.first_name },
        { name: 'last_name', content: user.last_name },
        { name: 'role', content: values.role },
        { name: 'email', content: values.email },
        { name: 'institution_name', content: values.institution },
        { name: 'institution_zipcode', content: values.postcode },
        { name: 'institution_city', content: values.city },
        { name: 'app_name', content: values.application_name },
        { name: 'licence_requested', content: values.licences },
        { name: 'app_platform', content: values.platform },
        { name: 'comment', content: values.question },
      ];
      return template_content;
    } else {
      const template_content = [
        { name: 'first_name', content: user.first_name },
        { name: 'last_name', content: user.last_name },
        { name: 'role', content: values.role },
        { name: 'email', content: values.email },
        { name: 'institution_name', content: values.institution },
        { name: 'institution_zipcode', content: values.postcode },
        { name: 'institution_city', content: values.city },
        { name: 'app_name', content: values.application_name },
        { name: 'licence_requested', content: values.licences },
        { name: 'app_platform', content: values.platform },
        { name: 'comment', content: values.question },
      ];
      return template_content;
    }
  } else {
    const template_content = [
      { name: 'app_name', content: values.application_name },
      { name: 'app_editor', content: values.editor_name },
      { name: 'app_platform', content: values.platform },
    ];
    return template_content;
  }
};

const serializeMessage = (
  values: RequestFormValues,
  user: Person,
  template_content: TemplateContent[],
  isReport: boolean,
  application?: ConfigurationPayload,
) => {
  const EMAIL_TEMPLATE = {
    PAID_APP_REPORT: 'applications_new_app_report',
    PAID_APP_CONFIRM: 'applications_new_app_report',
    NEW_APP_REPORT: 'applications_new_app_report',
    NEW_APP_CONFIRM: 'applications_new_app_report',
  };

  const EMAIL_ADDRESS = {
    PARTNER: 'nnguyen@unowhy.com', // TO change to partner's email
    NOREPLY: 'noreply@unowhy.com',
    PROF: `${values.email}`,
  };

  const EMAIL_SUBJECT = {
    PAID_APP_REPORT: `Votre demande d’ajout de l’application ${values.application_name} au catalogue SQOOL Applications a bien été enregistrée.`,
    PAID_APP_CONFIRM: `Votre demande de devis de l’application ${values.application_name} à ajouter au catalogue SQOOL Applications a bien été enregistrée.`,
    NEW_APP_REPORT: `[SQOOL Applications] L'application ${values.application_name} est demandé par ${
      userName(user) || ''
    }`,
    NEW_APP_CONFIRM: `[SQOOL Applications] La demande de devis pour ${values.application_name} est demandé par ${
      userName(user) || ''
    }`,
  };

  if (application) {
    const message = {
      key: MAILCHIMP_API_KEY,
      template_name: `${isReport ? EMAIL_TEMPLATE.PAID_APP_REPORT : EMAIL_TEMPLATE.PAID_APP_CONFIRM}`,
      template_content,
      message: {
        from_email: EMAIL_ADDRESS.NOREPLY,
        subject: `${isReport ? EMAIL_SUBJECT.PAID_APP_REPORT : EMAIL_SUBJECT.PAID_APP_CONFIRM}`,
        to: [
          {
            email: `${isReport ? EMAIL_ADDRESS.PARTNER : EMAIL_ADDRESS.PROF}`,
            type: 'to',
          },
        ],
        merge_language: 'handlebars',
        global_merge_vars: template_content,
      },
    };
    return message;
  } else {
    const message = {
      key: MAILCHIMP_API_KEY,
      template_name: `${isReport ? EMAIL_TEMPLATE.NEW_APP_REPORT : EMAIL_TEMPLATE.NEW_APP_CONFIRM}`,
      template_content,
      message: {
        from_email: EMAIL_ADDRESS.NOREPLY,
        subject: `${isReport ? EMAIL_SUBJECT.NEW_APP_REPORT : EMAIL_SUBJECT.NEW_APP_CONFIRM}`,
        to: [
          {
            email: `${isReport ? EMAIL_ADDRESS.PARTNER : EMAIL_ADDRESS.PROF}`,
            type: 'to',
          },
        ],
        merge_language: 'handlebars',
        global_merge_vars: template_content,
      },
    };
    return message;
  }
};

const postEmail = async (message_report: Message, message_confirm: Message) => {
  try {
    const response_report = fetch(MAILCHIMP_API_URI, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(message_report),
    });
    const response_confirm = fetch(MAILCHIMP_API_URI, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(message_confirm),
    });
    const response_all = await Promise.all([response_report, response_confirm]);
    return response_all;
  } catch (error) {
    console.error(error);
  }
};
