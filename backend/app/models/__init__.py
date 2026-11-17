from app.models.base import Base, TimestampMixin
from app.models.college import College
from app.models.department import Department
from app.models.user import User, UserRole
from app.models.student_profile import StudentProfile
from app.models.faculty_profile import FacultyProfile

# AI Campus Assistant models
from app.models.document import Document, DocumentStatus
from app.models.document_chunk import DocumentChunk
from app.models.chat import AssistantChat
from app.models.assistant_message import (
    AssistantMessage,
    MessageRole,
)

__all__ = [
    "Base",
    "TimestampMixin",
    "College",
    "Department",
    "User",
    "UserRole",
    "StudentProfile",
    "FacultyProfile",
    "Document",
    "DocumentStatus",
    "DocumentChunk",
    "AssistantChat",
    "AssistantMessage",
    "MessageRole",
    "CommunityPost",
    "CommunityLike",
    "CommunityComment",
    "AcademicQuestion",
    "AcademicAnswer",
    "AcademicAnswerLike",
    "LearningResource",
    "DirectConversation",
    "DirectMessage",
]

from app.models.community import (
    CommunityPost,
    CommunityLike,
    CommunityComment,
)

from app.models.academic_qa import (
    AcademicQuestion,
    AcademicAnswer,
    AcademicAnswerLike,
)

from app.models.notice import Notice
from app.models.learning_resource import LearningResource
from app.models.direct_message import DirectConversation, DirectMessage
