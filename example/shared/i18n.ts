// Two languages for the three example apps. The demos are written in English;
// `t('English text')` returns the Vietnamese text when that language is chosen.
//
// The language is read once, when the page loads, and switching reloads the
// page. That keeps every demo free of language state: a field list is still a
// plain constant, exactly as it would be in an application.

export type Lang = 'en' | 'vi';

const STORAGE_KEY = 'dfk-demo-lang';

function detect(): Lang {
  // Prerendering (the React app) has no browser to ask.
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'vi') return saved;
  } catch {
    // Storage can be unavailable (private mode); fall through.
  }
  return window.navigator.language?.toLowerCase().startsWith('vi')
    ? 'vi'
    : 'en';
}

export const lang: Lang = detect();

if (typeof document !== 'undefined') {
  document.documentElement.lang = lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Without storage the choice cannot survive the reload.
  }
  window.location.reload();
}

/** The text in the current language. English is the key and the fallback. */
export function t(english: string): string {
  return lang === 'vi' ? (VI[english] ?? english) : english;
}

const VI: Record<string, string> = {
  // Navigation and page chrome
  Basics: 'Cơ bản',
  '← All demos': '← Tất cả demo',
  'View code': 'Xem code',
  'Hide code': 'Ẩn code',
  Copy: 'Copy',
  Copied: 'Đã copy',
  'Form data': 'Dữ liệu form',
  'Validation errors': 'Lỗi kiểm tra',
  'Submit Form': 'Gửi form',
  'Reset Form': 'Đặt lại form',
  Reset: 'Đặt lại',
  Submit: 'Gửi đăng ký',
  'Submitting…': 'Đang gửi…',
  'Submitted:': 'Submit thành công:',
  '-- Choose --': '-- Chọn --',

  // Page titles and introductions
  'Registering renderers with fieldRegistry, MultiFieldInput, layouts, computed fields (computeValue) and repeatable groups.':
    'Đăng ký renderer qua fieldRegistry, MultiFieldInput, layout, trường dẫn xuất (computeValue) và nhóm lặp lại.',
  'Registering components with fieldRegistry, dfk-multi-field-input, layouts, computed fields (computeValue) and repeatable groups.':
    'Đăng ký component qua fieldRegistry, dfk-multi-field-input, layout, trường dẫn xuất (computeValue) và nhóm lặp lại.',
  'Validators, dynamic options and conditions':
    'Validators, options động và điều kiện',
  'Built-in validators (required, email, compose), options that depend on another field, appearCondition / disabledCondition and async validation.':
    'Built-in validators (required, email, compose), options phụ thuộc trường khác, appearCondition / disabledCondition và async validation.',
  'Form state with useDynamicForm': 'Form state với useDynamicForm',
  'Form state with createDynamicFormStore':
    'Form state với createDynamicFormStore',
  'The hook owns data, errors, touched and submit state; DynamicFormDevTools sits in the corner.':
    'Hook giữ data, errors, touched và trạng thái submit; DynamicFormDevTools ở góc màn hình.',
  'The composable owns data, errors, touched and submit state; DynamicFormDevTools sits in the corner.':
    'Composable giữ data, errors, touched và trạng thái submit; DynamicFormDevTools ở góc màn hình.',
  'The signal store owns data, errors, touched and submit state; DevTools sits in the corner.':
    'Signal store giữ data, errors, touched và trạng thái submit; DevTools ở góc màn hình.',
  'createWizardState, validateStep, goNext / goPrev. State is immutable: every navigation returns a new state.':
    'createWizardState, validateStep, goNext / goPrev. State là bất biến — mỗi lần điều hướng trả về một state mới.',
  'JSON Schema, drafts and Undo / Redo': 'JSON Schema, bản nháp và Undo / Redo',
  'fieldsFromJsonSchema builds the form from a JSON Schema, createFormDraft keeps the data across reloads, createFormHistory gives undo / redo.':
    'fieldsFromJsonSchema dựng form từ một JSON Schema, createFormDraft giữ dữ liệu qua lần tải lại trang, createFormHistory cho undo / redo.',

  // Field labels and options
  'First Name': 'Tên',
  'Last Name': 'Họ',
  'Full Name (computed)': 'Họ tên (tự tính)',
  'Full name': 'Họ và tên',
  Age: 'Tuổi',
  Contacts: 'Liên hệ',
  Add: 'Thêm',
  Remove: 'Xoá',
  Phone: 'Điện thoại',
  'Phone number': 'Số điện thoại',
  Country: 'Quốc gia',
  Vietnam: 'Việt Nam',
  'United States': 'Hoa Kỳ (USA)',
  City: 'Thành phố',
  Hanoi: 'Hà Nội',
  'Ho Chi Minh City': 'TP. Hồ Chí Minh',
  'Da Nang': 'Đà Nẵng',
  Gender: 'Giới tính',
  Male: 'Nam',
  Female: 'Nữ',
  Other: 'Khác',
  'Date of birth': 'Ngày sinh',
  Satisfaction: 'Mức độ hài lòng',
  'Send me the newsletter': 'Nhận bản tin',
  Password: 'Mật khẩu',
  Plan: 'Gói dịch vụ',
  Free: 'Miễn phí',
  'Enter a username (try "admin")': 'Nhập username (thử "admin")',
  'Show the extra field?': 'Hiển thị trường bổ sung?',
  No: 'Không',
  Yes: 'Có',
  'Extra note (appears when "Yes" is chosen)':
    'Ghi chú thêm (Xuất hiện khi chọn "Có")',
  'Lock the phone number field?': 'Khóa trường số điện thoại?',
  Unlocked: 'Mở khóa',
  'Locked (disabled)': 'Khóa (Disabled)',
  'Jane Doe': 'Nguyễn Văn A',

  // Validation messages
  'Please choose a country': 'Vui lòng chọn quốc gia',
  'Please choose a city': 'Vui lòng chọn thành phố',
  'Please choose a plan': 'Vui lòng chọn gói',
  'Email is required': 'Email bắt buộc',
  'Invalid email format': 'Định dạng email không hợp lệ',
  'Password is required': 'Mật khẩu bắt buộc',
  'At least 8 characters': 'Tối thiểu 8 ký tự',
  'Full name is required': 'Họ tên bắt buộc',
  'Username is required': 'Username bắt buộc',
  'The name "admin" is taken': 'Tên "admin" đã tồn tại',
  'Checking…': 'Đang kiểm tra...',
  'Check for errors': 'Kiểm tra lỗi',

  // Wizard
  Account: 'Tài khoản',
  Profile: 'Hồ sơ',
  Preferences: 'Tuỳ chọn',
  Step: 'Bước',
  'Done!': 'Hoàn tất!',
  Finish: 'Hoàn tất',
  '← Back': '← Quay lại',
  'Next →': 'Tiếp theo →',

  // JSON Schema, drafts and undo
  'Draft restored, saved at': 'Đã khôi phục bản nháp lưu lúc',
  'Clear draft': 'Xoá bản nháp',
  'Type in a few fields and reload the page: the data is still there (kept in localStorage). Undo groups consecutive typing in one field into a single step.':
    'Nhập vài ô rồi tải lại trang: dữ liệu vẫn còn (lưu trong localStorage). Undo gom các lần gõ liên tiếp vào cùng một ô thành một bước.',
  'warnings: the parts of the schema that did not become fields':
    'warnings: phần schema không thành field',
};
