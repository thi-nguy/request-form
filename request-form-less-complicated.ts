import { t } from 'i18next';
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

const enum EMAIL_TEMPLATE {
  new_app_report = 'applications_new_app_report',
  new_app_confirmation = 'applications_new_app_confirmation',
  premium_app_report = 'applications_premium_app_report',
  premium_app_confirmation = 'applications_premium_app_confirmation',
}

export const postRequestForm = async (values: RequestFormValues, user: Person, application?: ConfigurationPayload) => {
  const report = serializeMessage(values, user, 'report', application);
  const confirmation = serializeMessage(values, user, 'confirmation', application);
  const report_post = await postEmail(report);
  if (report_post) {
    const confirmation_post = await postEmail(confirmation);
    if (confirmation_post) {
      return confirmation_post.json();
    }
  }
};

const serializeMessage = (
  values: RequestFormValues,
  user: Person,
  type: 'report' | 'confirmation',
  application?: ConfigurationPayload,
) => {
  let subject;
  let template_name;
  let template_content;

  const report_content = [
    { name: 'first_name', content: user.first_name },
    { name: 'last_name', content: user.last_name },
    { name: 'role', content: values.role },
    { name: 'email', content: values.email },
    { name: 'institution_name', content: values.institution },
    { name: 'institution_zipcode', content: values.postcode },
    { name: 'institution_city', content: values.city },
    { name: 'comment', content: values.question },
  ];

  const confirmation_content = [
    { name: 'app_name', content: values.application_name },
    { name: 'app_platform', content: values.platform },
  ];

  const editor_content = [{ name: 'app_editor', content: values.editor_name }];
  const licences_content = [{ name: 'licenses_amount', content: values.licences }];

  const EMAIL_TO = {
    report: 'partenariats@unowhy.com',
    confirmation: values.email,
  };

  if (application) {
    switch (type) {
      case 'report':
        template_name = EMAIL_TEMPLATE.premium_app_report;
        subject = t('email.premium_app_report', { application: values.application_name, user: userName(user) });
        template_content = report_content.concat(confirmation_content).concat(licences_content);
        break;
      case 'confirmation':
        template_name = EMAIL_TEMPLATE.premium_app_confirmation;
        subject = t('email.premium_app_confirmation', { application: values.application_name });
        template_content = confirmation_content.concat(licences_content);
        break;
    }
  } else {
    switch (type) {
      case 'report':
        template_name = EMAIL_TEMPLATE.new_app_report;
        subject = t('email.new_app_report', { application: values.application_name, user: userName(user) });
        template_content = report_content.concat(confirmation_content).concat(editor_content);
        break;
      case 'confirmation':
        template_name = EMAIL_TEMPLATE.new_app_confirmation;
        subject = t('email.new_app_confirmation', { application: values.application_name });
        template_content = confirmation_content.concat(editor_content);
        break;
    }
  }

  const message = {
    key: MAILCHIMP_API_KEY,
    template_name,
    template_content,
    message: {
      from_email: 'noreply@unowhy.com',
      subject,
      to: [
        {
          email: EMAIL_TO[type],
          type: 'to',
        },
      ],
      merge_language: 'handlebars',
      global_merge_vars: template_content,
    },
  };

  return message;
};

const postEmail = async (message: Message) => {
  try {
    return await fetch(MAILCHIMP_API_URI, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error(error);
  }
};
